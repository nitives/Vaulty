import { Page } from "@/lib/storage";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfTag } from "@bradleyhodges/sfsymbols";
import clsx from "clsx";
import React, { useRef, useEffect } from "react";

interface SidebarPageProps {
  page: Page;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, type: "page") => void;
  isNested?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
  onStartRename?: (id: string, type: "page", currentName: string) => void;
}

export function SidebarPage({
  page,
  activeFilter,
  onFilterChange,
  onContextMenu,
  isNested = false,
  isRenaming = false,
  renameValue = "",
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
}: SidebarPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <button
      onClick={() => {
        if (!isRenaming) onFilterChange(`page:${page.id}`);
      }}
      onContextMenu={(e) => onContextMenu(e, page.id, "page")}
      className={clsx(
        "transition-colors rounded-lg text-sm flex flex-1 relative w-full items-center",
        isNested ? "px-0 py-0" : "px-30 py-1.5",
        isNested
          ? activeFilter === `page:${page.id}`
            ? "text-black/90 dark:text-white/90 bg-black/10 dark:bg-white/5"
            : "text-black/75 hover:text-black/90 dark:text-white/75 dark:hover:text-white/90 hover:bg-black/5 dark:hover:bg-white/5"
          : activeFilter === `page:${page.id}`
            ? "bg-[var(--accent-100)] text-[var(--accent-900)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-100)] font-medium"
            : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
      )}
    >
      <span className="w-[2px] h-[28px] mx-[15px] flex justify-center bg-black/10 dark:bg-white/10" />
      {isRenaming ? (
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => onRenameChange?.(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onRenameCommit?.();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              onRenameCancel?.();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 w-full min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white rounded-sm placeholder-neutral-400 px-2 pl-0 py-1"
        />
      ) : (
        <span
          className="px-2 pl-0 py-1 truncate text-left"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartRename?.(page.id, "page", page.name);
          }}
        >
          {page.name}
        </span>
      )}
    </button>
  );
}
