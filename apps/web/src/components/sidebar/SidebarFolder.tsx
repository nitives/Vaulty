import { Folder, Page } from "@/lib/storage";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfFolder, sfPlus } from "@bradleyhodges/sfsymbols";
import clsx from "clsx";
import { SidebarPage } from "./SidebarPage";
import React, { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

interface SidebarFolderProps {
  folder: Folder;
  pages: Page[];
  isExpanded: boolean;
  activeFilter: string;
  isCreatingPage: boolean;
  newPageName: string;
  pageInputRef: React.RefObject<HTMLInputElement | null>;
  onToggle: (id: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    id: string,
    type: "folder" | "page",
  ) => void;
  onStartCreatePage: (folderId: string) => void;
  onFilterChange: (filter: string) => void;
  onCommitCreatePage: () => void;
  onPageInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setNewPageName: (name: string) => void;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
  renamingTarget?: { id: string; type: "folder" | "page" } | null;
  onStartRename?: (
    id: string,
    type: "folder" | "page",
    currentName: string,
  ) => void;
}

export function SidebarFolder({
  folder,
  pages,
  isExpanded,
  activeFilter,
  isCreatingPage,
  newPageName,
  pageInputRef,
  onToggle,
  onContextMenu,
  onStartCreatePage,
  onFilterChange,
  onCommitCreatePage,
  onPageInputKeyDown,
  setNewPageName,
  isRenaming = false,
  renameValue = "",
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  renamingTarget,
  onStartRename,
}: SidebarFolderProps) {
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Sortable for the folder itself
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder:${folder.id}`,
    data: { type: "folder", folder },
  });

  // Droppable zone for pages to be dropped INTO this folder
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-drop:${folder.id}`,
    data: { type: "folder-drop", folderId: folder.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  // Sortable IDs for nested pages
  const pageIds = pages.map((p) => `page:${p.id}`);

  return (
    <div
      ref={setSortableRef}
      style={style}
      data-folder-id={folder.id}
      className={clsx(isDragging && "opacity-50 z-50")}
    >
      {/* Folder row */}
      <div
        ref={setDroppableRef}
        className={clsx(
          "flex items-center group mb-[2px]",
          isOver &&
            "bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 rounded-lg",
        )}
      >
        <button
          name="Toggle Folder"
          {...attributes}
          {...listeners}
          onClick={() => {
            if (!isRenaming) onToggle(folder.id);
          }}
          onContextMenu={(e) => onContextMenu(e, folder.id, "folder")}
          className={clsx(
            "transition-colors rounded-lg text-sm duration-[250ms] hover:duration-0",
            "flex flex-1 items-center gap-2.5 px-2 py-1",
            "hover:bg-black/5 dark:hover:bg-white/5",
            "touch-none cursor-grab active:cursor-grabbing",
          )}
        >
          {/* Folder icon */}
          <span className="w-5 flex justify-center text-black/30 dark:text-white/30 shrink-0">
            <SFIcon icon={sfFolder} size={16} />
          </span>

          {/* Folder name */}
          {isRenaming ? (
            <input
              ref={renameInputRef}
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
              className="flex-1 w-full min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white text-left rounded-sm placeholder-neutral-400 font-medium text-black/80 dark:text-white/80"
            />
          ) : (
            <span
              className="truncate text-left font-medium text-black/80 dark:text-white/80"
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartRename?.(folder.id, "folder", folder.name);
              }}
            >
              {folder.name}
            </span>
          )}
        </button>

        {/* New page button (visible on hover) */}
        <button
          onClick={() => onStartCreatePage(folder.id)}
          className={clsx(
            "px-2 cursor-pointer",
            "transition-colors",
            "opacity-0 group-hover:opacity-100",
            "text-black/15 hover:text-black/35",
            "dark:text-white/25 dark:hover:text-white/35",
          )}
          title="New Page"
        >
          <SFIcon icon={sfPlus} size={10} weight={1} />
        </button>
      </div>

      {/* Nested pages with continuous tree line */}
      {isExpanded && (
        <div
          className={clsx(
            "ml-[18px]",
            "border-l-[2px]",
            "border-black/10 dark:border-white/10",
            "pl-3",
            "space-y-0.5",
            "mb-1",
          )}
        >
          <SortableContext
            items={pageIds}
            strategy={verticalListSortingStrategy}
          >
            {isCreatingPage && (
              <div className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm text-neutral-700 dark:text-neutral-200">
                <input
                  ref={pageInputRef}
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  onBlur={onCommitCreatePage}
                  onKeyDown={onPageInputKeyDown}
                  className="flex-1 min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white rounded-sm placeholder-neutral-400"
                />
              </div>
            )}
            {pages.length === 0 && !isCreatingPage ? (
              <p className="select-none px-2 py-1 text-xs text-black/30 dark:text-white/30 italic">
                Empty
              </p>
            ) : (
              pages.map((page) => (
                <SidebarPage
                  key={page.id}
                  page={page}
                  isNested
                  activeFilter={activeFilter}
                  onFilterChange={onFilterChange}
                  onContextMenu={onContextMenu}
                  isRenaming={
                    renamingTarget?.id === page.id &&
                    renamingTarget?.type === "page"
                  }
                  renameValue={renameValue}
                  onRenameChange={onRenameChange}
                  onRenameCommit={onRenameCommit}
                  onRenameCancel={onRenameCancel}
                  onStartRename={onStartRename}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}
