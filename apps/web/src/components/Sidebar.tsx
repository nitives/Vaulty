"use client";

import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";

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
  { id: "reminders", label: "Reminders", icon: "⏰" },
];

const EXPANDED_WIDTH = 224; // 56 * 4 (Tailwind w-56)
const COLLAPSED_WIDTH = 0;

export function Sidebar({
  activeFilter,
  onFilterChange,
  isCollapsed,
}: SidebarProps) {
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
      {/* <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="tags"
            className="border-t border-neutral-200 p-4 dark:border-neutral-800"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.33, ease: [0.308, 0.003, 0.142, 1] }}
          >
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence> */}
    </motion.aside>
  );
}
