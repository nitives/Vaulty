"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import clsx from "clsx";
import {
  Sidebar,
  InputBar,
  ItemList,
  SearchBar,
  Item,
  Titlebar,
  SettingsModal,
} from "@/components";
import { generateId, parseTimeQuery } from "@/lib/utils";
import { SettingsProvider, useSettings } from "@/lib/settings";
import {
  loadItems as loadStoredItems,
  addItem as addStoredItem,
  deleteItem as deleteStoredItem,
  saveImage,
} from "@/lib/storage";

export default function Home() {
  return (
    <SettingsProvider>
      <HomeContent />
    </SettingsProvider>
  );
}

function HomeContent() {
  const { settings } = useSettings();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  // Toggle body class for transparent background
  useEffect(() => {
    if (settings.transparency) {
      document.body.classList.add("transparent-mode");
    } else {
      document.body.classList.remove("transparent-mode");
    }
    return () => {
      document.body.classList.remove("transparent-mode");
    };
  }, [settings.transparency]);

  // Sync input bar position class with settings
  useEffect(() => {
    if (settings.inputBarPosition === "top") {
      document.documentElement.classList.add("input-bar-top");
    } else {
      document.documentElement.classList.remove("input-bar-top");
    }
  }, [settings.inputBarPosition]);

  const handleAddItem = useCallback(
    async (
      content: string,
      tags: string[],
      type: "note" | "image" | "link",
      imageData?: string,
      imageName?: string,
    ) => {
      let imagePath: string | undefined;

      // Save image to disk if present
      if (imageData && type === "image") {
        // Generate unique filename: timestamp_originalname
        const timestamp = Date.now();
        const safeName = (imageName || "image.png").replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const uniqueFilename = `${timestamp}_${safeName}`;

        const savedPath = await saveImage(imageData, uniqueFilename);
        if (savedPath) {
          imagePath = savedPath;
        }
      }

      const newItem: Item = {
        id: generateId(),
        type,
        // For images, use the image name as content if no caption provided
        content:
          type === "image" && !content && imageName ? imageName : content,
        tags,
        createdAt: new Date(),
        imageUrl: imagePath,
      };

      // Update local state immediately for responsiveness
      setItems((prev) => [newItem, ...prev]);

      // Persist to storage
      await addStoredItem(newItem);
    },
    [],
  );

  const handleDeleteItem = useCallback(async (id: string) => {
    // Update local state immediately
    setItems((prev) => prev.filter((item) => item.id !== id));

    // Persist to storage
    await deleteStoredItem(id);
  }, []);

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

    // Filter by type
    if (activeFilter !== "all") {
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
      const { cleanQuery, startDate, endDate } = parseTimeQuery(searchQuery);
      const lowerQuery = cleanQuery.toLowerCase();

      result = result.filter((item) => {
        // Date filter
        if (startDate && item.createdAt < startDate) return false;
        if (endDate && item.createdAt > endDate) return false;

        // Text search
        if (lowerQuery) {
          const matchesContent = item.content
            .toLowerCase()
            .includes(lowerQuery);
          const matchesTags = item.tags.some((tag) =>
            tag.toLowerCase().includes(lowerQuery),
          );
          return matchesContent || matchesTags;
        }

        return true;
      });
    }

    return result;
  }, [items, activeFilter, searchQuery, activeTagFilter]);

  return (
    <div
      suppressHydrationWarning
      className={clsx(
        "flex h-screen w-screen flex-col",
        "transparent:bg-white/0 transparent:dark:bg-black/10",
        "bg-white dark:bg-neutral-900",
      )}
    >
      {/* Custom Titlebar */}
      <Titlebar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <div
        className={clsx(
          "flex flex-1 overflow-hidden",
          "bg-white dark:bg-neutral-900",
          "transparent:bg-white/0 transparent:dark:bg-black/0",
        )}
      >
        {/* Sidebar */}
        <Sidebar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          isCollapsed={sidebarCollapsed}
        />

        {/* Main Content */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {/* Header with Search */}
          <header
            suppressHydrationWarning
            className={clsx(
              "px-6 py-4",
              "border-b",
              "border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)]",
              "transparent:bg-white/50 transparent:dark:bg-neutral-900/50 transparent:backdrop-blur-sm",
              "bg-white dark:bg-neutral-900",
            )}
          >
            <div className="mx-auto max-w-4xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
              />
            </div>
          </header>

          {/* Input Bar - Top position */}
          <div className="input-bar-top-container shrink-0 border-b border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)] px-6 py-4 bg-white dark:bg-neutral-900 transparent:bg-white/50 transparent:dark:bg-neutral-900/50 transparent:backdrop-blur-sm">
            <div className="mx-auto max-w-4xl">
              <InputBar onSubmit={handleAddItem} />
            </div>
          </div>

          {/* Content Area */}
          <div className="content-area flex-1 overflow-y-auto px-6 py-6 flex">
            <div>
              {/* Active Tag Filter Badge */}

              {activeTagFilter && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Filtering by tag:
                  </span>
                  <button
                    onClick={() => setActiveTagFilter(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    #{activeTagFilter}
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Item List */}
              <ItemList
                items={filteredItems}
                onTagClick={handleTagClick}
                onDeleteItem={handleDeleteItem}
                isLoading={isLoading}
                emptyMessage={
                  searchQuery
                    ? "No items match your search."
                    : "No items yet. Add something!"
                }
              />
            </div>
          </div>

          {/* Input Bar - Bottom position (floating overlay) */}
          <div className="input-bar-bottom-container pointer-events-none absolute bottom-0 left-0 right-0 px-6 py-4 pt-8">
            <div className="pointer-events-auto mx-auto">
              <InputBar onSubmit={handleAddItem} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
