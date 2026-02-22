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
              "w-full max-w-sm overflow-hidden rounded-xl border p-6 shadow-xl",
              "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-[24px]",
              "border-neutral-200 dark:border-neutral-700",
              "transparent:bg-white/60 transparent:dark:bg-neutral-900/60"
            )}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3
              id="confirm-modal-title"
              className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2"
            >
              {title}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              {message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className={clsx(buttonStyles.base)}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={clsx(
                  "rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity",
                  isDestructive
                    ? buttonStyles.danger
                    : buttonStyles.primary
                )}
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
