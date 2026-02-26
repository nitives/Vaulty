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
  childFolders: Folder[];
  getPagesForFolder: (folderId: string) => Page[];
  getChildFolders: (folderId: string) => Folder[];
  depth?: number;
  isSortable?: boolean;
  isFolderExpanded: (folderId: string) => boolean;
  activeFilter: string;
  creatingPageFolderId: string | null;
  creatingFolderParentId: string | null;
  newPageName: string;
  newFolderName: string;
  pageInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onToggle: (id: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    id: string,
    type: "folder" | "page",
  ) => void;
  onStartCreateFolder: (parentFolderId: string) => void;
  onStartCreatePage: (folderId: string) => void;
  onFilterChange: (filter: string) => void;
  onCommitCreateFolder: () => void;
  onCommitCreatePage: () => void;
  onFolderInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPageInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setNewFolderName: (name: string) => void;
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
  childFolders,
  getPagesForFolder,
  getChildFolders,
  depth = 0,
  isSortable = false,
  isFolderExpanded,
  activeFilter,
  creatingPageFolderId,
  creatingFolderParentId,
  newPageName,
  newFolderName,
  pageInputRef,
  folderInputRef,
  onToggle,
  onContextMenu,
  onStartCreateFolder,
  onStartCreatePage,
  onFilterChange,
  onCommitCreateFolder,
  onCommitCreatePage,
  onFolderInputKeyDown,
  onPageInputKeyDown,
  setNewFolderName,
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
  const isExpanded = isFolderExpanded(folder.id);
  const isCreatingPageHere = creatingPageFolderId === folder.id;
  const isCreatingFolderHere = creatingFolderParentId === folder.id;

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
    disabled: !isSortable,
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
          {...(isSortable ? attributes : {})}
          {...(isSortable ? listeners : {})}
          onClick={() => {
            if (!isRenaming) onToggle(folder.id);
          }}
          onContextMenu={(e) => onContextMenu(e, folder.id, "folder")}
          className={clsx(
            "transition-colors rounded-lg text-sm duration-[250ms] hover:duration-0",
            "flex flex-1 items-center gap-2.5 px-2 py-1",
            "hover:bg-black/5 dark:hover:bg-white/5",
            isSortable && "touch-none cursor-grab active:cursor-grabbing",
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
              spellCheck={false}
              onChange={(e) => onRenameChange?.(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
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

        <div className="flex gap-2.5 mr-3.5 pl-2">
          <button
            onClick={() => onStartCreateFolder(folder.id)}
            className={clsx(
              "cursor-pointer",
              "transition-colors",
              "opacity-0 group-hover:opacity-100",
              "text-black/15 hover:text-black/35",
              "dark:text-white/25 dark:hover:text-white/35",
            )}
            title="New Subfolder"
          >
            <SFIcon icon={sfFolder} size={14} weight={1} />
          </button>
          <button
            onClick={() => onStartCreatePage(folder.id)}
            className={clsx(
              "cursor-pointer",
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
          {isCreatingFolderHere && (
            <div className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm text-neutral-700 dark:text-neutral-200">
              <SFIcon icon={sfFolder} size={11} className="opacity-70 mx-0.5" />
              <input
                ref={folderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onBlur={onCommitCreateFolder}
                onKeyDown={onFolderInputKeyDown}
                className="flex-1 min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white rounded-sm placeholder-neutral-400"
              />
            </div>
          )}

          {childFolders.map((childFolder) => (
            <SidebarFolder
              key={childFolder.id}
              folder={childFolder}
              pages={getPagesForFolder(childFolder.id)}
              childFolders={getChildFolders(childFolder.id)}
              getPagesForFolder={getPagesForFolder}
              getChildFolders={getChildFolders}
              depth={depth + 1}
              isSortable={false}
              isFolderExpanded={isFolderExpanded}
              activeFilter={activeFilter}
              creatingPageFolderId={creatingPageFolderId}
              creatingFolderParentId={creatingFolderParentId}
              newPageName={newPageName}
              newFolderName={newFolderName}
              pageInputRef={pageInputRef}
              folderInputRef={folderInputRef}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              onStartCreateFolder={onStartCreateFolder}
              onStartCreatePage={onStartCreatePage}
              onFilterChange={onFilterChange}
              onCommitCreateFolder={onCommitCreateFolder}
              onCommitCreatePage={onCommitCreatePage}
              onFolderInputKeyDown={onFolderInputKeyDown}
              onPageInputKeyDown={onPageInputKeyDown}
              setNewFolderName={setNewFolderName}
              setNewPageName={setNewPageName}
              isRenaming={
                renamingTarget?.id === childFolder.id &&
                renamingTarget?.type === "folder"
              }
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              renamingTarget={renamingTarget}
              onStartRename={onStartRename}
            />
          ))}

          <SortableContext
            items={pageIds}
            strategy={verticalListSortingStrategy}
          >
            {isCreatingPageHere && (
              <div className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm text-neutral-700 dark:text-neutral-200">
                <input
                  ref={pageInputRef}
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={onCommitCreatePage}
                  onKeyDown={onPageInputKeyDown}
                  className="flex-1 min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white rounded-sm placeholder-neutral-400"
                />
              </div>
            )}
            {pages.length === 0 &&
            childFolders.length === 0 &&
            !isCreatingPageHere &&
            !isCreatingFolderHere ? (
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
