import { Page } from "@/lib/storage";
import clsx from "clsx";
import React, { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `page:${page.id}`,
    data: { type: "page", page },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const isActive = activeFilter === `page:${page.id}`;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isRenaming) onFilterChange(`page:${page.id}`);
      }}
      onContextMenu={(e) => onContextMenu(e, page.id, "page")}
      className={clsx(
        "transition-colors duration-[250ms] hover:duration-0",
        "rounded-lg text-sm flex w-full items-center",
        "px-2 py-1",
        "touch-none", // prevent scroll interference during drag
        isDragging && "opacity-50 z-50",
        isActive
          ? "text-black/90 dark:text-white/90 bg-black/10 dark:bg-white/5"
          : "text-black/50 dark:text-white/50 hover:text-black/75 dark:hover:text-white/75 hover:bg-black/5 dark:hover:bg-white/5",
      )}
    >
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
          className="flex-1 w-full min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white rounded-sm placeholder-neutral-400"
        />
      ) : (
        <span
          className="truncate text-left"
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
