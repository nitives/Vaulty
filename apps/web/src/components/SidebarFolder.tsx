import { Folder, Page } from "@/lib/storage";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfPlus, sfTag } from "@bradleyhodges/sfsymbols";
import clsx from "clsx";
import { DropdownChevron } from "./DropdownChevron";
import { SidebarPage } from "./SidebarPage";
import React, { useRef, useEffect } from "react";

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

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <div data-folder-id={folder.id}>
      <div className="flex items-center group">
        <button
          name="Toggle Folder"
          onClick={() => {
            if (!isRenaming) onToggle(folder.id);
          }}
          onContextMenu={(e) => onContextMenu(e, folder.id, "folder")}
          className={clsx(
            "transition-colors rounded-lg text-sm",
            "flex flex-1 items-center gap-2 px-2 py-1",
            "text-black/75 dark:text-white/75",
            "hover:bg-black/5 dark:hover:bg-white/5",
          )}
        >
          <span className="w-4 flex justify-center text-black/15 dark:text-white/25">
            <DropdownChevron isExpanded={isExpanded} />
          </span>
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
              className="flex-1 w-full min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white text-left rounded-sm placeholder-neutral-400"
            />
          ) : (
            <span
              className="truncate text-left"
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartRename?.(folder.id, "folder", folder.name);
              }}
            >
              {folder.name}
            </span>
          )}
        </button>
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

      {isExpanded && (
        <div className="pr-1 mt-0.5 space-y-0.5">
          {isCreatingPage && (
            <div className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
              <SFIcon icon={sfTag} size={10} className="opacity-70 mx-0.5" />
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
            <p className="select-none px-3 py-1 text-xs text-black/50 dark:text-white/50 italic">
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
        </div>
      )}
    </div>
  );
}
