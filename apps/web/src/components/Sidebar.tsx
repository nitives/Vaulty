"use client";

import { useSettings } from "@/lib/settings";
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

export function Sidebar({
  activeFilter,
  onFilterChange,
  isCollapsed,
}: SidebarProps) {
  return (
    <aside
      suppressHydrationWarning
      className={clsx(
        "flex flex-col transition-all duration-200",
        "border-r",
        "border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)]",
        "bg-white dark:bg-neutral-900",
        isCollapsed ? "w-16" : "w-56",
      )}
    >
      {/* Filters */}
      <nav className="flex-1 space-y-1 p-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeFilter === filter.id
                ? "bg-black/10 text-neutral-900 dark:bg-white/5 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {/* <span className="text-base">{filter.icon}</span> */}
            {!isCollapsed && <span>{filter.label}</span>}
          </button>
        ))}
      </nav>

      {/* Tags Section */}
      {!isCollapsed && (
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
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
        </div>
      )}
    </aside>
  );
}
