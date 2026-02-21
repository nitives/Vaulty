import { useState, useCallback, useMemo, useEffect } from "react";
import { Item } from "@/components/ItemCard";
import { generateId } from "@/lib/utils";
import { parseSearchQuery } from "@/lib/search";
import { useSettings } from "@/lib/settings";
import {
  loadItems as loadStoredItems,
  addItem as addStoredItem,
  deleteItem as deleteStoredItem,
  saveImage,
  updateItem as updateStoredItem,
} from "@/lib/storage";

export function useItems() {
  const { settings } = useSettings();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemToMove, setItemToMove] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Load items from storage on mount
  useEffect(() => {
    async function load() {
      try {
        const storedItems = await loadStoredItems();
        setItems(storedItems);
      } catch (err) {
        console.error("Failed to load items:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleAddItem = useCallback(
    async (
      content: string,
      tags: string[],
      type: "note" | "image" | "link" | "audio" | "video",
      imageData?: string,
      imageName?: string,
    ) => {
      let imagePath: string | undefined;
      let imageSize: number | undefined;
      let finalContent = content;
      let finalTags = [...tags];
      let pageId: string | undefined;

      if (activeFilter.startsWith("page:")) {
        pageId = activeFilter.split(":")[1];
      }

      // Save media to disk and process it if present
      if (
        imageData &&
        (type === "image" || type === "audio" || type === "video")
      ) {
        // Generate unique filename: timestamp_originalname
        const timestamp = Date.now();
        const safeName = (imageName || "image.png").replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const uniqueFilename = `${timestamp}_${safeName}`;

        const saveResult = await saveImage(imageData, uniqueFilename);
        if (saveResult && saveResult.path) {
          imagePath = saveResult.path;
          imageSize = saveResult.size;
        }
      }

      // Fetch metadata for links
      let metadata;
      if (type === "link" && window.electronAPI?.fetchMetadata) {
        try {
          const result = await window.electronAPI.fetchMetadata(finalContent);
          if (result && (result.title || result.description || result.image)) {
            metadata = result;
          }
        } catch (e) {
          console.error("Failed to fetch metadata:", e);
        }
      }

      const newItem: Item = {
        id: generateId(),
        type,
        // For images, use the image name as content if no caption provided
        content:
          type === "image" && !finalContent && imageName
            ? imageName
            : finalContent,
        tags: finalTags,
        createdAt: new Date(),
        imageUrl: imagePath,
        size: imageSize,
        metadata,
        pageId,
      };

      // Update local state immediately for responsiveness
      setItems((prev) => [newItem, ...prev]);

      // Persist to storage
      await addStoredItem(newItem);

      // Process image in the background without blocking the UI
      if (imageData && type === "image") {
        setIsProcessingImage(true);

        // Use IIFE to run this concurrently without blocking handleAddItem's return
        (async () => {
          try {
            const { processImage } = await import("@/lib/vision");
            const visionResult = await processImage(
              imageData,
              settings.useFlorence ?? false,
            );

            if (visionResult.text || visionResult.labels.length > 0) {
              const analyzedData = {
                content: visionResult.text || "",
                tags: visionResult.labels || [],
              };

              const updatedItem = { ...newItem, analyzed: analyzedData };

              // Update state with analyzed metadata
              setItems((prev) =>
                prev.map((item) =>
                  item.id === newItem.id ? updatedItem : item,
                ),
              );

              // Update storage with analyzed metadata
              await updateStoredItem(updatedItem);
            }
          } catch (e) {
            console.error("Failed to process image:", e);
          } finally {
            setIsProcessingImage(false);
          }
        })();
      }
    },
    [activeFilter, settings.useFlorence],
  );

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const id = itemToDelete;
    // Update local state immediately
    setItems((prev) => prev.filter((item) => item.id !== id));
    // Persist to storage
    await deleteStoredItem(id);
    setItemToDelete(null);
  }, [itemToDelete]);

  const handleDeleteItem = useCallback(
    (id: string) => {
      if (settings.confirmBeforeDelete ?? true) {
        setItemToDelete(id);
      } else {
        // Inline execution of deletion bypassing modal
        setItems((prev) => prev.filter((item) => item.id !== id));
        deleteStoredItem(id);
      }
    },
    [settings.confirmBeforeDelete],
  );

  const handleEditItem = useCallback(async (id: string, newContent: string) => {
    // Optimistic local update
    let updatedItem: Item | undefined;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = { ...item, content: newContent };
          return updatedItem;
        }
        return item;
      }),
    );

    // Persist to storage if item was found
    if (updatedItem) {
      await updateStoredItem(updatedItem);
    }
  }, []);

  const handleMoveItem = useCallback(
    async (pageId: string | null) => {
      if (!itemToMove) return;

      // Optimistic local update
      let updatedItem: Item | undefined;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemToMove) {
            updatedItem = { ...item, pageId: pageId || undefined };
            return updatedItem;
          }
          return item;
        }),
      );

      // Persist to storage list
      if (updatedItem) {
        await updateStoredItem(updatedItem);
      }
      setItemToMove(null);
    },
    [itemToMove],
  );

  const handleTagClick = useCallback((tag: string) => {
    setActiveTagFilter((prev) => (prev === tag ? null : tag));
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Reset tag filter when searching
    if (query) {
      setActiveTagFilter(null);
    }
  }, []);

  // Filter items based on active filter, search query, and tag filter
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by type or page
    if (activeFilter.startsWith("page:")) {
      const pageId = activeFilter.split(":")[1];
      result = result.filter((item) => item.pageId === pageId);
    } else if (activeFilter !== "all") {
      const typeMap: Record<string, Item["type"]> = {
        notes: "note",
        images: "image",
        links: "link",
        reminders: "reminder",
      };
      const filterType = typeMap[activeFilter];
      if (filterType) {
        result = result.filter((item) => item.type === filterType);
      }
    }

    // Filter by tag
    if (activeTagFilter) {
      result = result.filter((item) => item.tags.includes(activeTagFilter));
    }

    // Filter by search query
    if (searchQuery) {
      const { cleanQuery, startDate, endDate, sizeFilter } =
        parseSearchQuery(searchQuery);
      const lowerQuery = cleanQuery.toLowerCase();

      result = result.filter((item) => {
        // Date filter
        if (startDate && item.createdAt < startDate) return false;
        if (endDate && item.createdAt > endDate) return false;

        // Size filter
        if (sizeFilter) {
          if (item.type === "image") {
            if (item.size !== undefined) {
              const { operator, value } = sizeFilter;
              let matchesSize = false;
              if (operator === ">") matchesSize = item.size > value;
              else if (operator === ">=") matchesSize = item.size >= value;
              else if (operator === "<") matchesSize = item.size < value;
              else if (operator === "<=") matchesSize = item.size <= value;
              else matchesSize = item.size === value; // exact match or '='

              if (!matchesSize) return false;
            } else {
              // Image doesn't have a size recorded, assume it fails the filter
              return false;
            }
          } else if (settings.hideNotesWhenFilteringBySize) {
            // If we are filtering by size, and hide notes is enabled, hide non-images
            return false;
          }
        }

        // Text search
        if (lowerQuery) {
          const matchesContent = item.content
            .toLowerCase()
            .includes(lowerQuery);
          const matchesTags = item.tags.some((tag) =>
            tag.toLowerCase().includes(lowerQuery),
          );
          const matchesAnalyzedContent =
            item.analyzed?.content?.toLowerCase().includes(lowerQuery) ?? false;
          const matchesAnalyzedTags =
            item.analyzed?.tags?.some((tag) =>
              tag.toLowerCase().includes(lowerQuery),
            ) ?? false;

          return (
            matchesContent ||
            matchesTags ||
            matchesAnalyzedContent ||
            matchesAnalyzedTags
          );
        }

        return true;
      });
    }

    return result;
  }, [
    items,
    activeFilter,
    searchQuery,
    activeTagFilter,
    settings.hideNotesWhenFilteringBySize,
  ]);

  const displayItems = useMemo(() => {
    const pos = settings.inputBarPosition ?? "bottom";
    if (pos === "bottom") {
      // oldest -> newest so newest is nearest the bottom input
      return [...filteredItems].reverse();
    }
    // top: newest -> oldest
    return filteredItems;
  }, [filteredItems, settings.inputBarPosition]);

  return {
    items,
    isLoading,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    activeTagFilter,
    setActiveTagFilter,
    itemToDelete,
    setItemToDelete,
    itemToMove,
    setItemToMove,
    isProcessingImage,
    handleAddItem,
    confirmDelete,
    handleDeleteItem,
    handleEditItem,
    handleMoveItem,
    handleTagClick,
    handleSearch,
    displayItems,
  };
}
