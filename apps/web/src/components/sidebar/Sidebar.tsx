"use client";

import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import {
  sfExternaldrive,
  sfPlus,
  sfTag,
  sfFolder,
  sfFolderFill,
  sfTextPage,
  sfPencil,
  sfTrash,
  sfChevronDown,
} from "@bradleyhodges/sfsymbols";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ContextMenu } from "../ui/ContextMenu";
import {
  loadItems,
  loadFolders,
  loadPages,
  saveFolders,
  savePages,
  Folder,
  Page,
} from "@/lib/storage";
import { Item } from "../items/ItemCard";
import { generateId } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { SidebarFolder } from "./SidebarFolder";
import { SidebarPage } from "./SidebarPage";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

interface SidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  isCollapsed: boolean;
  items: Item[];
}

const filters = [
  { id: "all", label: "All Items" },
  { id: "notes", label: "Notes" },
  { id: "images", label: "Images" },
  { id: "links", label: "Links" },
  { id: "audio", label: "Audio" },
  // { id: "reminders", label: "Reminders" },
];

const EXPANDED_WIDTH = 224; // 56 * 4 (Tailwind w-56)
const COLLAPSED_WIDTH = 0;

export function Sidebar({
  activeFilter,
  onFilterChange,
  isCollapsed,
  items,
}: SidebarProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("New Folder");
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isCreatingPage, setIsCreatingPage] = useState<string | null>(null);
  const [newPageName, setNewPageName] = useState("New Page");
  const pageInputRef = useRef<HTMLInputElement>(null);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetId: string | null;
    targetType: "folder" | "page" | null;
  }>({ isOpen: false, x: 0, y: 0, targetId: null, targetType: null });

  const [renamingTarget, setRenamingTarget] = useState<{
    id: string;
    type: "folder" | "page";
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleContextMenu = (
    e: React.MouseEvent,
    targetId: string,
    targetType: "folder" | "page",
  ) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetId,
      targetType,
    });
  };

  const deleteFolder = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this folder? All pages inside will also be deleted.",
      )
    )
      return;
    const newFolders = folders.filter((f) => f.id !== id);
    setFolders(newFolders);
    await saveFolders(newFolders);

    // Also delete associated pages
    const newPages = pages.filter((p) => p.folderId !== id);
    setPages(newPages);
    await savePages(newPages);
  };

  const deletePage = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this page?")) return;
    const newPages = pages.filter((p) => p.id !== id);
    setPages(newPages);
    await savePages(newPages);
    if (activeFilter === `page:${id}`) {
      onFilterChange("all");
    }
  };

  const handleRenameCommit = async () => {
    if (!renamingTarget) return;
    const name = renameValue.trim();
    if (!name) {
      setRenamingTarget(null);
      return;
    }

    if (renamingTarget.type === "folder") {
      const newFolders = folders.map((f) =>
        f.id === renamingTarget.id ? { ...f, name } : f,
      );
      setFolders(newFolders);
      await saveFolders(newFolders);
    } else {
      const newPages = pages.map((p) =>
        p.id === renamingTarget.id ? { ...p, name } : p,
      );
      setPages(newPages);
      await savePages(newPages);
    }
    setRenamingTarget(null);
  };

  const handleRenameCancel = () => {
    setRenamingTarget(null);
  };

  const handleStartRename = (
    id: string,
    type: "folder" | "page",
    currentName: string,
  ) => {
    setRenamingTarget({ id, type });
    setRenameValue(currentName);
  };

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
        const [storedFolders, storedPages] = await Promise.all([
          loadFolders(),
          loadPages(),
        ]);
        setFolders(storedFolders);
        setPages(storedPages);
      } catch (err) {
        console.error("Failed to load sidebar data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const startCreateFolder = () => {
    setIsCreatingFolder(true);
    setNewFolderName("New Folder");
    setTimeout(() => {
      folderInputRef.current?.focus();
      folderInputRef.current?.select();
    }, 0);
  };

  const commitCreateFolder = async () => {
    if (!isCreatingFolder) return;
    setIsCreatingFolder(false);
    const name = newFolderName.trim();
    if (!name) return;

    const newFolder: Folder = { id: generateId(), name, createdAt: new Date() };
    const newFolders = [...folders, newFolder];
    setFolders(newFolders);
    await saveFolders(newFolders);
  };

  const handleFolderInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      commitCreateFolder();
    } else if (e.key === "Escape") {
      setIsCreatingFolder(false);
    }
  };

  const startCreatePage = (folderId: string | null = null) => {
    setIsCreatingPage(folderId || "root");
    setNewPageName("New Page");
    if (folderId) {
      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
    setTimeout(() => {
      pageInputRef.current?.focus();
      pageInputRef.current?.select();
    }, 0);
  };

  const commitCreatePage = async () => {
    if (!isCreatingPage) return;
    const targetFolderId = isCreatingPage === "root" ? null : isCreatingPage;
    setIsCreatingPage(null);
    const name = newPageName.trim();
    if (!name) return;

    const newPage: Page = {
      id: generateId(),
      name,
      folderId: targetFolderId,
      createdAt: new Date(),
    };
    const newPages = [...pages, newPage];
    setPages(newPages);
    await savePages(newPages);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitCreatePage();
    } else if (e.key === "Escape") {
      setIsCreatingPage(null);
    }
  };

  // -- DnD setup --
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Build sortable IDs: root pages + folders interleaved
  const rootPages = pages.filter((p) => !p.folderId);
  const sortableIds = useMemo(() => {
    const ids: string[] = [];
    rootPages.forEach((p) => ids.push(`page:${p.id}`));
    folders.forEach((f) => ids.push(`folder:${f.id}`));
    return ids;
  }, [rootPages, folders]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // 1) Page dropped onto a folder drop zone → move page into that folder
      if (activeData?.type === "page" && overData?.type === "folder-drop") {
        const targetFolderId = overData.folderId as string;
        const newPages = pages.map((p) =>
          p.id === activeData.page.id ? { ...p, folderId: targetFolderId } : p,
        );
        setPages(newPages);
        await savePages(newPages);
        return;
      }

      // 2) Folder reordering
      if (activeData?.type === "folder" && overData?.type === "folder") {
        const oldIndex = folders.findIndex(
          (f) => f.id === activeData.folder.id,
        );
        const newIndex = folders.findIndex((f) => f.id === overData.folder.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newFolders = arrayMove(folders, oldIndex, newIndex);
          setFolders(newFolders);
          await saveFolders(newFolders);
        }
        return;
      }

      // 3) Page reordering (same container)
      if (activeData?.type === "page" && overData?.type === "page") {
        const activePage = activeData.page as Page;
        const overPage = overData.page as Page;

        // Same folder or both root
        if (activePage.folderId === overPage.folderId) {
          const containerPages = pages.filter(
            (p) => p.folderId === activePage.folderId,
          );
          const oldIndex = containerPages.findIndex(
            (p) => p.id === activePage.id,
          );
          const newIndex = containerPages.findIndex(
            (p) => p.id === overPage.id,
          );
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reordered = arrayMove(containerPages, oldIndex, newIndex);
            // Replace just the container segment in the full pages array
            const otherPages = pages.filter(
              (p) => p.folderId !== activePage.folderId,
            );
            const newPages = [...otherPages, ...reordered];
            setPages(newPages);
            await savePages(newPages);
          }
        } else {
          // Cross-folder: move page to the target page's folder
          const newPages = pages.map((p) =>
            p.id === activePage.id ? { ...p, folderId: overPage.folderId } : p,
          );
          setPages(newPages);
          await savePages(newPages);
        }
        return;
      }
    },
    [folders, pages],
  );

  return (
    <motion.aside
      id="vaulty-sidebar"
      suppressHydrationWarning
      className={clsx(
        "flex flex-col overflow-hidden", // important for width: 0
        "border-r",
        "border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)]",
        "bg-white dark:bg-neutral-900",
        "sidebar",
      )}
      // Motion animates the width directly (0px -> 224px)
      animate={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      initial={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.33, ease: [0.308, 0.003, 0.142, 1] }}
      style={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
    >
      {/* Inner wrapper: fixed width so content clips instead of squishing */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ minWidth: EXPANDED_WIDTH }}
      >
        {/* Filters */}
        <nav className="space-y-1 p-2">
          <AnimatePresence initial={false}>
            {filters.map((filter) => (
              <motion.button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 compact:py-1 text-sm transition-colors duration-[250ms] hover:duration-0",
                  activeFilter === filter.id
                    ? `text-black/90 dark:text-white/90
                       bg-black/10 dark:bg-white/5`
                    : `text-black/75 hover:text-black/90 dark:text-white/75 dark:hover:text-white/90
                      hover:bg-black/5 dark:hover:bg-white/5`,
                )}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                suppressHydrationWarning
              >
                {/* <span className="text-base">{filter.icon}</span> */}
                {filter.label}
              </motion.button>
            ))}
          </AnimatePresence>
        </nav>

        {/* Folders & Pages Tree */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="flex items-center justify-between px-3 py-2">
            <h3
              className={clsx(
                "select-none",
                "text-xs font-semibold uppercase tracking-wider",
                "text-black/35 dark:text-white/25",
              )}
            >
              Folders
            </h3>
            <div className="flex gap-2.5">
              <button
                onClick={startCreateFolder}
                className={clsx(
                  "cursor-pointer",
                  "transition-colors",
                  "text-black/35 hover:text-black/75",
                  "dark:text-white/25 dark:hover:text-white/35",
                )}
                title="New Folder"
              >
                <SFIcon icon={sfFolder} size={14} />
              </button>
              <button
                onClick={() => startCreatePage(null)}
                className={clsx(
                  "cursor-pointer",
                  "transition-colors",
                  "text-black/35 hover:text-black/75",
                  "dark:text-white/25 dark:hover:text-white/35",
                )}
                title="New Page"
              >
                <SFIcon icon={sfTextPage} size={13} />
              </button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {/* Inline create folder */}
                {isCreatingFolder && (
                  <div>
                    <div className="flex items-center group">
                      <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                        <span className="w-4 flex justify-center opacity-70">
                          <SFIcon icon={sfFolder} size={14} />
                        </span>
                        <input
                          ref={folderInputRef}
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onBlur={commitCreateFolder}
                          onKeyDown={handleFolderInputKeyDown}
                          className="flex-1 w-full min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white rounded-sm placeholder-neutral-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline create page at root */}
                {isCreatingPage === "root" && (
                  <div className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                    <SFIcon
                      icon={sfTag}
                      size={12}
                      className="opacity-70 mx-0.5"
                    />
                    <input
                      ref={pageInputRef}
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      onBlur={commitCreatePage}
                      onKeyDown={handlePageInputKeyDown}
                      className="flex-1 w-full min-w-0 bg-transparent outline-none selection:bg-[var(--accent-600)] selection:text-white rounded-sm placeholder-neutral-400"
                    />
                  </div>
                )}

                {/* Pages without a folder */}
                {rootPages.map((page) => (
                  <SidebarPage
                    key={page.id}
                    page={page}
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                    onContextMenu={handleContextMenu}
                    isRenaming={
                      renamingTarget?.id === page.id &&
                      renamingTarget?.type === "page"
                    }
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onRenameCommit={handleRenameCommit}
                    onRenameCancel={handleRenameCancel}
                    onStartRename={handleStartRename}
                  />
                ))}

                {/* Folders containing pages */}
                {folders.map((folder) => {
                  const folderPages = pages.filter(
                    (p) => p.folderId === folder.id,
                  );
                  const isExpanded = expandedFolders.has(folder.id);

                  return (
                    <SidebarFolder
                      key={folder.id}
                      folder={folder}
                      pages={folderPages}
                      isExpanded={isExpanded}
                      activeFilter={activeFilter}
                      isCreatingPage={isCreatingPage === folder.id}
                      newPageName={newPageName}
                      pageInputRef={pageInputRef}
                      onToggle={toggleFolder}
                      onContextMenu={handleContextMenu}
                      onStartCreatePage={startCreatePage}
                      onFilterChange={onFilterChange}
                      onCommitCreatePage={commitCreatePage}
                      onPageInputKeyDown={handlePageInputKeyDown}
                      setNewPageName={setNewPageName}
                      isRenaming={
                        renamingTarget?.id === folder.id &&
                        renamingTarget?.type === "folder"
                      }
                      renameValue={renameValue}
                      onRenameChange={setRenameValue}
                      onRenameCommit={handleRenameCommit}
                      onRenameCancel={handleRenameCancel}
                      renamingTarget={renamingTarget}
                      onStartRename={handleStartRename}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="p-2 *:select-none">
          {/* Tags Section */}
          <p title="Number of items" className="flex items-center gap-2">
            <SFIcon
              icon={sfTag}
              size={16}
              className="text-black/50 dark:text-white/30"
            />
            <span className="text-xs text-black/45 dark:text-white/25">
              {numberOfItems !== undefined
                ? `${numberOfItems} ${numberOfItems > 1 ? "items" : "item"}`
                : `-- items`}
            </span>
          </p>
          {/* Size Section */}

          <p
            title="Total size of all items"
            className="flex items-center gap-2 mt-1"
          >
            <SFIcon
              icon={sfExternaldrive}
              size={16}
              className="text-black/50 dark:text-white/30"
            />
            <span className="text-xs text-black/45 dark:text-white/25">
              {totalSize !== undefined && totalSize !== null
                ? `${totalSize}`
                : `-- MB`}
            </span>
          </p>
        </div>
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        items={[
          {
            label: "Rename",
            icon: sfPencil,
            onClick: () => {
              if (contextMenu.targetType === "folder") {
                const folder = folders.find(
                  (f) => f.id === contextMenu.targetId,
                );
                if (folder) {
                  setRenamingTarget({ id: folder.id, type: "folder" });
                  setRenameValue(folder.name);
                }
              } else if (contextMenu.targetType === "page") {
                const page = pages.find((p) => p.id === contextMenu.targetId);
                if (page) {
                  setRenamingTarget({ id: page.id, type: "page" });
                  setRenameValue(page.name);
                }
              }
            },
          },
          {
            label: "Delete",
            icon: sfTrash,
            variant: "danger",
            onClick: () => {
              if (contextMenu.targetType === "folder") {
                if (contextMenu.targetId) deleteFolder(contextMenu.targetId);
              } else if (contextMenu.targetType === "page") {
                if (contextMenu.targetId) deletePage(contextMenu.targetId);
              }
            },
          },
        ]}
      />
    </motion.aside>
  );
}
