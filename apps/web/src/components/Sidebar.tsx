"use client";

import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfExternaldrive, sfTag } from "@bradleyhodges/sfsymbols";
import { useEffect, useState, useMemo } from "react";
import { loadItems } from "@/lib/storage";
import { Item } from "./ItemCard";

interface SidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  isCollapsed: boolean;
}

const filters = [
  { id: "all", label: "All Items", icon: "📦" },
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "images", label: "Images", icon: "🖼️" },
  { id: "links", label: "Links", icon: "🔗" },
  // { id: "reminders", label: "Reminders", icon: "⏰" },
];

const EXPANDED_WIDTH = 224; // 56 * 4 (Tailwind w-56)
const COLLAPSED_WIDTH = 0;

export function Sidebar({
  activeFilter,
  onFilterChange,
  isCollapsed,
}: SidebarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const numberOfItems = useMemo(() => items.length || undefined, [items]);

  const totalSize = useMemo(() => {
    const bytes = items.reduce((sum, item) => sum + (item.size ?? 0), 0);
    if (bytes === 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, [items]);
  useEffect(() => {
    async function load() {
      try {
        const storedItems = await loadItems();
        setItems(storedItems);
      } catch (err) {
        console.error("Failed to load items:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <motion.aside
      suppressHydrationWarning
      className={clsx(
        "flex flex-col overflow-hidden", // important for width: 0
        "border-r",
        "border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)]",
        "bg-white dark:bg-neutral-900",
      )}
      // Motion animates the width directly (0px -> 224px)
      animate={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      initial={false}
      transition={{ duration: 0.33, ease: [0.308, 0.003, 0.142, 1] }}
      style={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
    >
      {/* Filters */}
      <nav className="flex-1 space-y-1 p-2">
        <AnimatePresence initial={false}>
          {filters.map((filter) =>
            !isCollapsed ? (
              <motion.button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeFilter === filter.id
                    ? "bg-black/10 text-neutral-900 dark:bg-white/5 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white",
                )}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {/* If you want icons even when collapsed, uncomment this */}
                {/* <span className="text-base">{filter.icon}</span> */}
                {filter.label}
              </motion.button>
            ) : null,
          )}
        </AnimatePresence>
      </nav>

      {/* Tags Section */}
      <div className="border-t border-neutral-200 p-2 dark:border-neutral-800 *:select-none">
        <p title="Number of items" className="flex items-center gap-2">
          <SFIcon
            icon={sfTag}
            size={16}
            className="text-black/50 dark:text-white/30"
          />
          <span className="text-xs text-neutral-900 dark:text-white/25">
            {numberOfItems !== undefined
              ? `${numberOfItems} ${numberOfItems > 1 ? "items" : "item"}`
              : `-- items`}
          </span>
        </p>
        {/* Size Section */}
        {totalSize && (
          <p
            title="Total size of all items"
            className="flex items-center gap-2 mt-1"
          >
            <SFIcon
              icon={sfExternaldrive}
              size={16}
              className="text-black/50 dark:text-white/30"
            />
            <span className="text-xs text-neutral-900 dark:text-white/25">
              {totalSize}
            </span>
          </p>
        )}
        {/* <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Recent Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {["minecraft", "genshin", "sample", "todo"].map((tag) => (
            <button
              key={tag}
              className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {tag}
            </button>
          ))}
        </div> */}
      </div>
    </motion.aside>
  );
}
