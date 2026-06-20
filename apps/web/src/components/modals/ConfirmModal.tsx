import clsx from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "@/lib/settings";
import { buttonStyles } from "@/styles/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmModalProps) {
  const { settings } = useSettings();
  const reduceMotion = settings.reduceMotion ?? false;

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
          onClick={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className={clsx(
              "w-full max-w-xs overflow-hidden rounded-3xl p-4 shadow-xl",
              "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-[24px]",
              "transparent:bg-white/50 transparent:dark:bg-neutral-900/50",
            )}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3
              id="confirm-modal-title"
              className="text-lg compact:text-base font-semibold tracking-tight text-neutral-900 dark:text-white mb-0"
            >
              {title}
            </h3>
            <p className="text-sm compact:text-xs text-neutral-600 dark:text-white/50 mb-4">
              {message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className={clsx(
                  "text-sm",
                  "compact:text-xs",
                  "px-3 py-2",
                  "compact:px-3 compact:py-1.5",
                  "rounded-lg",
                  "h-fit",
                  "transition-colors",
                  "bg-white/0 hover:bg-black/5",
                  "dark:bg-white/0 dark:hover:bg-white/5",
                  "text-white/10 hover:text-neutral-900",
                  "dark:text-white/75 dark:hover:text-white/50",
                )}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={clsx(
                  "text-sm",
                  "compact:text-xs",
                  "px-3 py-2",
                  "compact:px-3 compact:py-1.5",
                  "rounded-lg",
                  "h-fit",
                  "transition-colors",
                  "bg-red-500/10 hover:bg-red-500/20",
                  // "dark:bg-white/0 dark:hover:bg-white/5",
                  "text-white/10 hover:text-neutral-900",
                  "dark:text-red-500/75 dark:hover:text-red-500/100",
                )}
                // className={clsx(
                //   "rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity",
                //   isDestructive ? buttonStyles.danger : buttonStyles.primary,
                // )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
