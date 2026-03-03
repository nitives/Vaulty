"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { getElectronAPI } from "@/lib/electron";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import {
  sfArrowDownCircle,
  sfArrowUpRight,
  sfXmark,
} from "@bradleyhodges/sfsymbols";

const TEST_MODE = false;

type UpdateState =
  | "idle"
  | "checking"
  | "update-available"
  | "no-update"
  | "downloading"
  | "downloaded"
  | "error"
  | "disabled-in-dev";

interface UpdateStatusPayload {
  state: UpdateState;
  currentVersion?: string;
  availableVersion?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

const VISIBLE_STATES: UpdateState[] = [
  "update-available",
  "downloading",
  "downloaded",
];

const TEST_STATUS: UpdateStatusPayload = {
  state: "update-available",
  currentVersion: "1.0.4",
  availableVersion: "1.1.0",
};

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatusPayload | null>(
    TEST_MODE ? TEST_STATUS : null,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (TEST_MODE) return;

    const api = getElectronAPI();
    if (!api) return;

    // Get current status in case update was already detected before mount
    api.getUpdateStatus?.().then((s: UpdateStatusPayload) => {
      if (s && VISIBLE_STATES.includes(s.state)) {
        setStatus(s);
      }
    });

    // Subscribe to live updates
    const unsub = api.onUpdateStatus?.((payload: UpdateStatusPayload) => {
      setStatus(payload);
      // Un-dismiss when a new actionable state arrives
      if (VISIBLE_STATES.includes(payload.state)) {
        setDismissed(false);
      }
    });

    return () => {
      unsub?.();
    };
  }, []);

  const handleDownload = useCallback(() => {
    if (TEST_MODE) return;
    getElectronAPI()?.downloadUpdate?.();
  }, []);

  const handleInstall = useCallback(() => {
    if (TEST_MODE) return;
    getElectronAPI()?.installUpdate?.();
  }, []);

  const isVisible =
    status && VISIBLE_STATES.includes(status.state) && !dismissed;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className={clsx(
            "update-notification",
            "absolute bottom-4 left-4 z-50 w-72",
            "rounded-xl border p-4",
            "border-neutral-200/80 dark:border-white/10",
            "bg-white dark:bg-neutral-900",
            "backdrop-blur-xl shadow-lg select-none",
          )}
        >
          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className={clsx(
              "absolute top-2.5 right-2.5 flex size-6 p-2 items-center justify-center rounded-md",
              "text-neutral-400 dark:text-neutral-500",
              "hover:text-neutral-600 dark:hover:text-neutral-300",
              "hover:bg-black/5 dark:hover:bg-white/10",
              "transition-colors cursor-pointer",
            )}
            aria-label="Dismiss notification"
          >
            <SFIcon className="size-full" weight={1} icon={sfXmark} />
          </button>

          {/* Header icon + title */}
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className={clsx(
                "flex size-5 shrink-0 items-center justify-center rounded-lg",
                "text-[var(--accent-600)]  dark:text-[var(--accent-400)]",
              )}
            >
              <SFIcon className="size-full" icon={sfArrowDownCircle} />
            </div>
            <div>
              <h4
                className={clsx(
                  "text-sm font-semibold leading-tight",
                  "text-neutral-900 dark:text-neutral-100",
                )}
              >
                {status.state === "downloaded"
                  ? "Update Ready"
                  : "Update Available"}
              </h4>
              {status.availableVersion && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
                  v{status.availableVersion}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
            {status.state === "update-available" && (
              <p>
                A new version of Vaulty is available.
                <br />
                <a
                  href={
                    status.availableVersion
                      ? `https://github.com/nitives/Vaulty/releases/tag/v${status.availableVersion}`
                      : "https://github.com/nitives/Vaulty/releases"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:underline cursor-pointer"
                >
                  See what&apos;s new.{" "}
                  <SFIcon size={6.5} weight={1} icon={sfArrowUpRight} />
                </a>
              </p>
            )}
            {status.state === "downloading" && <p>Downloading update…</p>}
            {status.state === "downloaded" && (
              <p>Update downloaded! Restart to install.</p>
            )}
          </div>

          {/* Progress bar (downloading) */}
          {status.state === "downloading" && (
            <div className="mb-3">
              <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[var(--accent-500)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${status.percent ?? 0}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 text-right">
                {Math.round(status.percent ?? 0)}%
              </p>
            </div>
          )}

          {/* Action button */}
          {status.state === "update-available" && (
            <button
              onClick={handleDownload}
              className={clsx(
                "w-full rounded-lg px-3 py-1.5 text-sm font-medium",
                "cursor-pointer transition-colors",
                "text-white border border-white/25",
                "bg-[var(--accent-600)] hover:bg-[var(--accent-700)]",
              )}
            >
              Download Update
            </button>
          )}

          {status.state === "downloaded" && (
            <button
              onClick={handleInstall}
              className={clsx(
                "w-full rounded-lg px-3 py-1.5 text-sm font-medium",
                "cursor-pointer transition-colors",
                "text-white border border-white/25",
                "bg-[var(--accent-600)] hover:bg-[var(--accent-700)]",
              )}
            >
              Restart &amp; Install
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
