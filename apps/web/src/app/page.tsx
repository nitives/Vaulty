"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import {
  Sidebar,
  InputBar,
  ItemList,
  Titlebar,
  SettingsModal,
  ConfirmModal,
  MoveModal,
  FloatingSearchBar,
} from "@/components";
import { useSettings } from "@/lib/settings";
import { useThemeClasses } from "@/hooks/useThemeClasses";
import { useItems } from "@/hooks/useItems";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfArrowDown, sfArrowUp } from "@bradleyhodges/sfsymbols";

export default function Home() {
  const { settings } = useSettings();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = (window as any).__VAULTY_SETTINGS__;
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
    handleMoveItem,
    handleTagClick,
    handleSearch,
    displayItems,
  } = useItems();

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

  // NEW: Track whether user is near bottom (only in bottom mode)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (settings.inputBarPosition === "bottom") {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 48;
      setShowScrollButton(distanceFromBottom > 150);
    } else {
      setShowScrollButton(el.scrollTop > 150);
    }
  }, [settings.inputBarPosition]);

  const scrollToStart = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (settings.inputBarPosition === "bottom") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
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
          onFilterChange={setActiveFilter}
          isCollapsed={sidebarCollapsed}
          items={items}
        />
        {/* Inline script: runs before first paint to collapse sidebar if needed */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(${(() => {
              const s = (window as any).__VAULTY_SETTINGS__;
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
              <FloatingSearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                onClose={() => {
                  setSearchVisible(false);
                  handleSearch("");
                }}
              />
            )}
          </AnimatePresence>

          {/* Unified Input Bar */}
          <div
            className={clsx(
              "z-10 transition-all duration-300",
              settings.inputBarPosition === "top"
                ? "shrink-0 px-6 py-4"
                : "pointer-events-none absolute bottom-0 left-0 right-0 px-6 py-4 pt-8 compact:pt-4",
            )}
          >
            <div
              className={clsx(
                "transition-all duration-300",
                settings.inputBarPosition === "top"
                  ? "max-w-4xl"
                  : "pointer-events-auto",
              )}
            >
              <InputBar onSubmit={handleAddItem} />
            </div>
          </div>

          {/* Scroll Back Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToStart}
                className={clsx(
                  "cursor-pointer",
                  "absolute right-8 z-40 flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur",
                  "bg-white/90 dark:bg-neutral-800/90 text-[var(--accent-600)] dark:text-[var(--accent-400)]",
                  "border border-neutral-200 dark:border-neutral-700",
                  "hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)] transition-colors",
                  settings.inputBarPosition === "bottom"
                    ? "bottom-24"
                    : "top-24",
                )}
                aria-label="Scroll to latest"
              >
                <SFIcon
                  icon={
                    settings.inputBarPosition === "bottom"
                      ? sfArrowDown
                      : sfArrowUp
                  }
                  size={16}
                />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="content-area compact:pb-[5rem]! flex-1 overflow-y-auto px-6 py-6 flex"
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
                onDelete={handleDeleteItem}
                onEdit={handleEditItem}
                onMove={setItemToMove}
                compact={settings.compactMode}
                isLoading={isLoading}
                emptyMessage={
                  searchQuery
                    ? "No items match your search."
                    : "No items yet. Add something!"
                }
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
