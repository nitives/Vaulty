"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import {
  Sidebar,
  InputBar,
  ItemList,
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
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfMagnifyingglass, sfXmark } from "@bradleyhodges/sfsymbols";

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
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

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

  // Sync accent color attribute with settings
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-accent",
      settings.accentColor ?? "blue",
    );

    // If multicolor is selected, fetch and apply Windows accent color
    if (
      settings.accentColor === "multicolor" &&
      window.electronAPI?.getWindowsAccentColor
    ) {
      window.electronAPI.getWindowsAccentColor().then((color) => {
        if (color) {
          // Set the base color - CSS uses oklch to derive all shades
          document.documentElement.style.setProperty(
            "--windows-accent-base",
            color,
          );
          console.log("Applied Windows accent color:", color);
        }
      });
    }
  }, [settings.accentColor]);

  // Ctrl+F keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchVisible(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && searchVisible) {
        setSearchVisible(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchVisible]);

  const toggleSearch = useCallback(() => {
    setSearchVisible((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else {
        setSearchQuery("");
      }
      return !prev;
    });
  }, []);

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

  const displayItems = useMemo(() => {
    const pos = settings.inputBarPosition ?? "bottom";
    if (pos === "bottom") {
      // oldest -> newest so newest is nearest the bottom input
      return [...filteredItems].reverse();
    }
    // top: newest -> oldest
    return filteredItems;
  }, [filteredItems, settings.inputBarPosition]);

  // NEW: Track whether user is near bottom (only in bottom mode)
  const handleScroll = useCallback(() => {
    if (settings.inputBarPosition !== "bottom") return;
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  }, [settings.inputBarPosition]);

  // NEW: On first load or switching to bottom, jump to bottom
  useEffect(() => {
    if (!isLoading && settings.inputBarPosition === "bottom") {
      const el = scrollRef.current;
      if (!el) return;

      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [isLoading, settings.inputBarPosition]);

  // NEW: When list/filters change in bottom mode, keep pinned only if user was near bottom
  useEffect(() => {
    if (settings.inputBarPosition !== "bottom") return;
    const el = scrollRef.current;
    if (!el) return;
    if (!stickToBottomRef.current) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [
    settings.inputBarPosition,
    items.length,
    activeFilter,
    activeTagFilter,
    searchQuery,
    isLoading,
  ]);

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
        onToggleSearch={toggleSearch}
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
          // onTagClick={handleTagClick}
          // recentTags={Array.from(
          //   new Set(items.flatMap((item) => item.tags).filter(Boolean)),
          // ).slice(0, 8)}
        />

        {/* Main Content */}
        <main
          className={clsx(
            "relative flex flex-1 flex-col overflow-hidden transition-colors",
            "bg-[var(--main-content-background-tint-light)]",
            "dark:bg-[var(--main-content-background-tint-dark)]",
          )}
        >
          {/* Floating Search Bar - Top Right with animation */}
          <AnimatePresence>
            {searchVisible && (
              <motion.div
                key="search-bar"
                initial={{ y: -10, opacity: 0, filter: "blur(12px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -10, opacity: 0, filter: "blur(12px)" }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-4 right-6 z-50"
              >
                <div className="relative flex items-center">
                  <SFIcon
                    icon={sfMagnifyingglass}
                    size={16}
                    className="absolute left-3 text-neutral-900 dark:text-white/50 z-10"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch(searchQuery);
                      if (e.key === "Escape") {
                        setSearchVisible(false);
                        setSearchQuery("");
                      }
                    }}
                    placeholder="Search…"
                    className={clsx(
                      "h-9 w-72 rounded-lg pl-10 pr-8 text-sm shadow-lg backdrop-blur",
                      "bg-white/80 dark:bg-neutral-800/80",
                      "text-neutral-900 dark:text-neutral-100",
                      "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
                      "border border-neutral-200 dark:border-neutral-700",
                      "!outline-none transition-all focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent",
                    )}
                  />
                  <button
                    onClick={() => {
                      setSearchVisible(false);
                      setSearchQuery("");
                    }}
                    className="absolute cursor-pointer right-0 size-8 flex items-center justify-center z-10 transition-colors text-neutral-900 hover:text-neutral-600 dark:text-white/50 dark:hover:text-white/50"
                  >
                    <SFIcon icon={sfXmark} size={12} weight={0.5} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Bar - Top position */}
          <div className="input-bar-top-container shrink-0 border-b border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)] px-6 py-4 bg-white dark:bg-neutral-900 transparent:bg-white/50 transparent:dark:bg-neutral-900/50 transparent:backdrop-blur-sm">
            <div className="mx-auto max-w-4xl">
              <InputBar onSubmit={handleAddItem} />
            </div>
          </div>

          {/* Content Area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="content-area flex-1 overflow-y-auto px-6 py-6 flex"
          >
            <div>
              {/* Active Tag Filter Badge */}

              {activeTagFilter && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Filtering by tag:
                  </span>
                  <button
                    onClick={() => setActiveTagFilter(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-100)] px-3 py-1 text-sm font-medium text-[var(--accent-800)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-200)]"
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
                items={displayItems}
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
