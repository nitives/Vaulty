"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import {
  Sidebar,
  InputBar,
  ItemList,
  Feed,
  Titlebar,
  SettingsModal,
  ConfirmModal,
  MoveModal,
  FloatingSearchBar,
} from "@/components";
import { UpdateNotification } from "@/components/layout/UpdateNotification";
import { useSettings } from "@/lib/settings";
import { useThemeClasses } from "@/hooks/useThemeClasses";
import { useItems } from "@/hooks/useItems";
import { useFeed } from "@/hooks/useFeed";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfArrowDown, sfArrowUp } from "@bradleyhodges/sfsymbols";
import { TagFilter } from "@/components/layout/TagFilter";

export default function Home() {
  const { settings } = useSettings();
  const persistInputBarStateOnSwitch =
    settings.persistInputBarStateOnSwitch ?? true;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = window.__VAULTY_SETTINGS__;
      if (cached && cached.startCollapsed) return true;
    }
    return false;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Apply body classes from settings
  useThemeClasses(settings);

  // Load and manage items
  const {
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
    handleUpdateTags,
    handleMoveItem,
    handleTagClick,
    handleSearch,
    displayItems,
  } = useItems();
  const {
    feedItems,
    unseenCount,
    isLoading: isFeedLoading,
    markSeen: markFeedItemSeen,
  } = useFeed();
  const inputBarPosition = settings.inputBarPosition ?? "bottom";
  const preserveSectionScroll = Boolean(
    settings.experiments?.["preserve-section-scroll"],
  );
  const sectionScrollPositionsRef = useRef<Map<string, number>>(new Map());
  const previousScrollStateRef = useRef({
    activeFilter,
    inputBarPosition,
    isLoading,
    preserveSectionScroll,
  });

  const visibleFeedItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return feedItems;
    }

    const query = searchQuery.trim().toLowerCase();
    return feedItems.filter((item) => {
      const contentText = item.content.replace(/<[^>]*>/g, " ").toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.pulseName.toLowerCase().includes(query) ||
        contentText.includes(query)
      );
    });
  }, [feedItems, searchQuery]);

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
        handleSearch("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchVisible, handleSearch]);

  const toggleSearch = useCallback(() => {
    setSearchVisible((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else {
        handleSearch("");
      }
      return !prev;
    });
  }, [handleSearch]);

  const getSectionStartScrollTop = useCallback(
    (el: HTMLDivElement) => {
      if (inputBarPosition === "bottom") {
        return Math.max(0, el.scrollHeight - el.clientHeight);
      }
      return 0;
    },
    [inputBarPosition],
  );

  const updateScrollAffordances = useCallback(
    (el: HTMLDivElement) => {
      if (inputBarPosition === "bottom") {
        const distanceFromBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distanceFromBottom < 48;
        setShowScrollButton(distanceFromBottom > 150);
      } else {
        setShowScrollButton(el.scrollTop > 150);
      }
    },
    [inputBarPosition],
  );

  const setSectionScrollTop = useCallback(
    (top: number) => {
      const el = scrollRef.current;
      if (!el) return;

      const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.min(Math.max(top, 0), maxScrollTop);
      updateScrollAffordances(el);
    },
    [updateScrollAffordances],
  );

  const saveSectionScroll = useCallback((filter: string) => {
    const el = scrollRef.current;
    if (!el) return;
    sectionScrollPositionsRef.current.set(filter, el.scrollTop);
  }, []);

  const handleFilterChange = useCallback(
    (nextFilter: string) => {
      if (nextFilter === activeFilter) return;
      saveSectionScroll(activeFilter);
      setActiveFilter(nextFilter);
    },
    [activeFilter, saveSectionScroll, setActiveFilter],
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    sectionScrollPositionsRef.current.set(activeFilter, el.scrollTop);
    updateScrollAffordances(el);
  }, [activeFilter, updateScrollAffordances]);

  const scrollToStart = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (inputBarPosition === "bottom") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [inputBarPosition]);

  useEffect(() => {
    const previous = previousScrollStateRef.current;
    const filterChanged = previous.activeFilter !== activeFilter;
    const positionChanged = previous.inputBarPosition !== inputBarPosition;
    const justLoaded = previous.isLoading && !isLoading;
    const preserveTurnedOff =
      previous.preserveSectionScroll && !preserveSectionScroll;

    if (positionChanged) {
      sectionScrollPositionsRef.current.clear();
    }

    previousScrollStateRef.current = {
      activeFilter,
      inputBarPosition,
      isLoading,
      preserveSectionScroll,
    };

    if (
      isLoading ||
      (!filterChanged && !positionChanged && !justLoaded && !preserveTurnedOff)
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;

      const savedTop =
        preserveSectionScroll && !positionChanged
          ? sectionScrollPositionsRef.current.get(activeFilter)
          : undefined;

      setSectionScrollTop(
        typeof savedTop === "number" ? savedTop : getSectionStartScrollTop(el),
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [
    activeFilter,
    getSectionStartScrollTop,
    inputBarPosition,
    isLoading,
    preserveSectionScroll,
    setSectionScrollTop,
  ]);

  // When the list changes in bottom mode, stay pinned only if the user was near bottom.
  useEffect(() => {
    if (inputBarPosition !== "bottom") return;
    const el = scrollRef.current;
    if (!el) return;
    if (!stickToBottomRef.current) return;

    const frame = requestAnimationFrame(() => {
      const current = scrollRef.current;
      if (!current) return;
      setSectionScrollTop(getSectionStartScrollTop(current));
    });

    return () => cancelAnimationFrame(frame);
  }, [
    activeTagFilter,
    getSectionStartScrollTop,
    inputBarPosition,
    isLoading,
    items.length,
    searchQuery,
    setSectionScrollTop,
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
        isProcessing={isProcessingImage}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ConfirmModal
        isOpen={itemToDelete !== null}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isDestructive={true}
      />
      <MoveModal
        isOpen={itemToMove !== null}
        onClose={() => setItemToMove(null)}
        onMove={handleMoveItem}
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
          onFilterChange={handleFilterChange}
          isCollapsed={sidebarCollapsed}
          items={items}
          unseenPulseCount={unseenCount}
        />
        {/* Inline script: runs before first paint to collapse sidebar if needed */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(${(() => {
              const s = window.__VAULTY_SETTINGS__;
              if (s && s.startCollapsed) {
                const el = document.getElementById("vaulty-sidebar");
                if (el) {
                  el.style.width = "0px";
                  el.style.borderRightWidth = "0px";
                  el.style.overflow = "hidden";
                }
              }
            }).toString()})()`,
          }}
        />

        <UpdateNotification />

        {/* Main Content */}
        <main
          className={clsx(
            "relative flex flex-1 flex-col overflow-hidden transition-colors",
            "bg-[var(--main-content-background-tint-light)]",
            "dark:bg-[var(--main-content-background-tint-dark)]",
          )}
        >
          {/* Floating UI Container */}
          <div className="absolute top-4 right-6 z-50 flex flex-col items-end gap-2">
            <AnimatePresence mode="popLayout">
              {searchVisible && (
                <FloatingSearchBar
                  key="search-bar"
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSearch={handleSearch}
                  onClose={() => {
                    setSearchVisible(false);
                    handleSearch("");
                  }}
                />
              )}
              {activeFilter !== "feeds" && activeTagFilter && (
                <TagFilter
                  key="tag-filter"
                  activeTagFilter={activeTagFilter}
                  setActiveTagFilter={setActiveTagFilter}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Unified Input Bar */}
          {(activeFilter !== "feeds" || persistInputBarStateOnSwitch) && (
            <div
              className={clsx(
                "z-10 transition-all duration-300",
                settings.inputBarPosition === "top"
                  ? "shrink-0 px-4 py-4"
                  : "pointer-events-none absolute bottom-0 left-0 right-0 px-4 py-4 pt-8 compact:pt-4",
                activeFilter === "feeds" &&
                  persistInputBarStateOnSwitch &&
                  "h-0 overflow-hidden !p-0 opacity-0 pointer-events-none",
              )}
            >
              <div
                className={clsx(
                  "transition-all duration-300",
                  settings.inputBarPosition === "top"
                    ? "max-w-4xl"
                    : "pointer-events-auto",
                  activeFilter === "feeds" &&
                    persistInputBarStateOnSwitch &&
                    "pointer-events-none",
                )}
              >
                <InputBar
                  key={
                    persistInputBarStateOnSwitch ? "persistent" : activeFilter
                  }
                  onSubmit={handleAddItem}
                />
              </div>
            </div>
          )}

          {/* Scroll Back Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                onClick={scrollToStart}
                className={clsx(
                  "cursor-pointer",
                  "absolute right-4 z-40 flex size-8 items-center justify-center rounded-full shadow-lg backdrop-blur",
                  "bg-white/90 dark:bg-neutral-800/90 text-[var(--accent-600)] dark:text-[var(--accent-400)]",
                  "border border-neutral-200 dark:border-neutral-700",
                  "hover:bg-neutral-200/90 dark:hover:bg-neutral-700/90 transition-colors",
                  settings.inputBarPosition === "bottom"
                    ? "bottom-[7rem]"
                    : "top-[7rem]",
                )}
                aria-label="Scroll to latest"
              >
                <SFIcon
                  icon={
                    settings.inputBarPosition === "bottom"
                      ? sfArrowDown
                      : sfArrowUp
                  }
                  size={12}
                />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="content-area flex-1 overflow-y-auto px-3 py-6 flex"
          >
            <div>
              {/* Item List */}
              {activeFilter === "feeds" ? (
                <Feed
                  items={visibleFeedItems}
                  isLoading={isFeedLoading}
                  onSeen={markFeedItemSeen}
                />
              ) : (
                <ItemList
                  items={displayItems}
                  onTagClick={handleTagClick}
                  onUpdateTags={handleUpdateTags}
                  onDelete={handleDeleteItem}
                  onEdit={handleEditItem}
                  onMove={setItemToMove}
                  compact={settings.compactMode}
                  isLoading={isLoading}
                  emptyMessage={
                    searchQuery
                      ? "No items match your search."
                      : {
                          main: "No items yet.",
                          sub: "Add something using the input.",
                        }
                  }
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
