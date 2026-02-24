import { useState, useEffect } from "react";
import { Folder, Page, loadFolders, loadPages } from "@/lib/storage";
import { buttonStyles } from "@/styles/Button";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfTag } from "@bradleyhodges/sfsymbols";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "@/lib/settings";

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (pageId: string | null) => void;
}

export function MoveModal({ isOpen, onClose, onMove }: MoveModalProps) {
  const { settings } = useSettings();
  const reduceMotion = settings.reduceMotion ?? false;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([loadFolders(), loadPages()]).then(([f, p]) => {
        setFolders(f);
        setPages(p);
      });
      setSelectedPageId(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onMove(selectedPageId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/5"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
          }
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-modal-title"
            className={clsx(
              // "w-full max-w-sm overflow-hidden rounded-xl border p-6 shadow-xl flex flex-col max-h-[80vh]",
              // "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-[24px]",
              // "border-neutral-200 dark:border-neutral-700",
              // "transparent:bg-white/60 transparent:dark:bg-neutral-900/60",

              "relative flex max-h-[80vh] w-full max-w-sm overflow-hidden rounded-xl window-b",
              "p-6 shadow-xl flex flex-col",
              "bg-white/75 dark:bg-neutral-900/85",
              "transparent:bg-neutral-100/95 transparent:dark:bg-neutral-900/95",
              "border-neutral-200 dark:border-neutral-700",
              "transparent:border-white/25 transparent:dark:border-white/10",
              "backdrop-blur-[24px]",
            )}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3
              id="move-modal-title"
              className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 shrink-0"
            >
              Move to Page
            </h3>

            <div className="flex-1 overflow-y-auto mb-6 pr-2 -mr-2 space-y-2">
              <button
                onClick={() => setSelectedPageId(null)}
                className={clsx(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  selectedPageId === null
                    ? "bg-[var(--accent-100)] text-[var(--accent-900)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-100)] font-medium"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
                )}
              >
                (No Page / All Items)
              </button>

              {/* Pages without a folder */}
              {pages
                .filter((p) => !p.folderId)
                .map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={clsx(
                      "w-full flex items-center gap-2 text-left px-3 py-2 rounded-md text-sm transition-colors",
                      selectedPageId === page.id
                        ? "bg-[var(--accent-100)] text-[var(--accent-900)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-100)] font-medium"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
                    )}
                  >
                    <SFIcon icon={sfTag} size={12} className="opacity-50" />
                    {page.name}
                  </button>
                ))}

              {/* Folders and their pages */}
              {folders.map((folder) => {
                const folderPages = pages.filter(
                  (p) => p.folderId === folder.id,
                );
                if (folderPages.length === 0) return null;
                return (
                  <div key={folder.id} className="pt-2 text-sm space-y-1">
                    <div className="px-2 py-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      {folder.name}
                    </div>
                    {folderPages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => setSelectedPageId(page.id)}
                        className={clsx(
                          "w-full flex items-center gap-2 text-left pl-6 pr-3 py-2 rounded-md text-sm transition-colors",
                          selectedPageId === page.id
                            ? "bg-[var(--accent-100)] text-[var(--accent-900)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-100)] font-medium"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
                        )}
                      >
                        <SFIcon icon={sfTag} size={12} className="opacity-50" />
                        {page.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 shrink-0">
              <button onClick={onClose} className={clsx(buttonStyles.base)}>
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={clsx(buttonStyles.primary)}
              >
                Move
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
