"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  useSettings,
  type AccentColor,
  type AppIconTheme,
} from "@/lib/settings";
import { Icon, type IconName } from "./Icon";
import { Toggle } from "./Toggle";
import { Select } from "./Select";
import { AccentColorPicker } from "./AccentColorPicker";
import { Slider } from "./Slider";
import { Button } from "./Button";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import {
  sfBookClosed,
  sfInfoCircle,
  sfInternaldrive,
  sfPaintbrush,
  sfSliderHorizontal3,
  sfXmark,
} from "@bradleyhodges/sfsymbols";
import { motion, AnimatePresence } from "motion/react";
import { buttonStyles } from "@/styles/Button";
import { IconDefinition } from "@bradleyhodges/sfsymbols-types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// -- Sidebar sections --

type SectionId = "appearance" | "behavior" | "storage" | "guide" | "about";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: IconDefinition;
}

const sections: SectionDef[] = [
  { id: "appearance", label: "Appearance", icon: sfPaintbrush },
  { id: "behavior", label: "Behavior", icon: sfSliderHorizontal3 },
  { id: "storage", label: "Storage", icon: sfInternaldrive },
  { id: "guide", label: "Guide", icon: sfBookClosed },
  { id: "about", label: "About", icon: sfInfoCircle },
];

// -- Reusable settings row --

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </p>
        {description && (
          <p className="text-xs text-neutral-500 w-[90%] dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// -- Section content components --

function AppearanceSection() {
  const { settings, update } = useSettings();

  return (
    <div className="space-y-2">
      <SettingsRow
        label="Theme"
        description="Choose your preferred color scheme"
      >
        <Select
          value={settings.theme ?? "system"}
          onChange={(v) => update({ theme: v as "system" | "light" | "dark" })}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </SettingsRow>
      <SettingsRow label="App icon" description="Choose the app icon variant">
        <Select
          value={settings.iconTheme ?? "default"}
          onChange={(v) => update({ iconTheme: v as AppIconTheme })}
          options={[
            { value: "default", label: "Default" },
            { value: "dev", label: "Dev" },
            { value: "dawn", label: "Dawn" },
          ]}
        />
      </SettingsRow>
      <SettingsRow
        label="Accent color"
        description="Multicolor uses your Windows accent color"
      >
        <AccentColorPicker
          value={settings.accentColor ?? "blue"}
          onChange={(v) => update({ accentColor: v as AccentColor })}
        />
      </SettingsRow>
      <SettingsRow
        label="Input bar position"
        description="Place the input bar at the top or bottom of the content area (also reverses the content order)"
      >
        <Select
          value={settings.inputBarPosition ?? "bottom"}
          onChange={(v) => update({ inputBarPosition: v as "top" | "bottom" })}
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
        />
      </SettingsRow>
      <SettingsRow label="Compact mode" description="Reduce spacing in the UI">
        <Toggle
          checked={settings.compactMode ?? false}
          onChange={(v) => update({ compactMode: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Transparent titlebar"
        description="Make the titlebar background transparent (Requires window transparency to be visible)"
      >
        <Toggle
          checked={settings.titlebarTransparent ?? false}
          onChange={(v) => update({ titlebarTransparent: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Transparent sidebar"
        description="Make the sidebar background transparent (Requires window transparency to be visible)"
      >
        <Toggle
          checked={settings.sidebarTransparent ?? false}
          onChange={(v) => update({ sidebarTransparent: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Window transparency"
        description="Enable transparent blur background"
      >
        <Toggle
          checked={settings.transparency ?? false}
          onChange={(v) => update({ transparency: v })}
        />
      </SettingsRow>
      {settings.transparency && (
        <SettingsRow
          label="Blur style"
          description="Mica uses your wallpaper tint, Acrylic uses a frosted glass effect"
        >
          <Select
            value={settings.backgroundMaterial ?? "mica"}
            onChange={(v) =>
              update({ backgroundMaterial: v as "mica" | "acrylic" })
            }
            options={[
              { value: "mica", label: "Mica" },
              { value: "acrylic", label: "Acrylic" },
            ]}
          />
        </SettingsRow>
      )}
      {/* Custom sliders for tint opacity, only when transparency is on and blur style is acrylic */}
      {settings.transparency && settings.backgroundMaterial === "acrylic" && (
        <>
          <SettingsRow
            label="Light mode tint opacity"
            description="Adjust the transparency for light mode background tint"
          >
            <Slider
              value={Math.round(
                (settings.backgroundTintOpacityLight ?? 1) * 10,
              )}
              min={0}
              max={10}
              stops={10}
              onChange={(v) => update({ backgroundTintOpacityLight: v / 10 })}
              ariaLabel="Light mode tint opacity"
            />
          </SettingsRow>
          <SettingsRow
            label="Dark mode tint opacity"
            description="Adjust the transparency for dark mode background tint"
          >
            <Slider
              value={Math.round(
                (settings.backgroundTintOpacityDark ?? 1.5) * 10,
              )}
              min={0}
              max={10}
              stops={10}
              onChange={(v) => update({ backgroundTintOpacityDark: v / 10 })}
              ariaLabel="Dark mode tint opacity"
            />
          </SettingsRow>
        </>
      )}
    </div>
  );
}

function BehaviorSection() {
  const { settings, update } = useSettings();
  const [modelSize, setModelSize] = useState<number | null>(null);
  const [needsRestartForMotion, setNeedsRestartForMotion] = useState(false);

  // Check if the Florence-2 model is currently installed in the browser's Cache API
  useEffect(() => {
    const checkModelCache = async () => {
      try {
        const cacheKeys = await caches.keys();
        const hfCacheName = cacheKeys.find((k) =>
          k.includes("transformers-cache"),
        );
        if (!hfCacheName) {
          setModelSize(0);
          return;
        }

        const cache = await caches.open(hfCacheName);
        const requests = await cache.keys();
        let totalBytes = 0;

        for (const req of requests) {
          // Only size up requests related to the model we use
          if (req.url.includes("Florence-2")) {
            const res = await cache.match(req);
            if (res && res.headers.has("content-length")) {
              totalBytes += parseInt(
                res.headers.get("content-length") || "0",
                10,
              );
            } else if (res) {
              // Fallback if no content-length: clone and read Blob (slower but accurate)
              const blob = await res.clone().blob();
              totalBytes += blob.size;
            }
          }
        }

        setModelSize(totalBytes);
      } catch (e) {
        console.error("Failed to check model cache size:", e);
        setModelSize(0);
      }
    };

    checkModelCache();
  }, [settings.useFlorence]); // Re-check when the user toggles it, as it downloads in the background

  return (
    <div className="space-y-2">
      <SettingsRow
        label="Start with sidebar collapsed"
        description="Sidebar will be collapsed on app launch"
      >
        <Toggle
          checked={settings.startCollapsed ?? false}
          onChange={(v) => update({ startCollapsed: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Confirm before deleting"
        description="Show confirmation dialog when deleting items"
      >
        <Toggle
          checked={settings.confirmBeforeDelete ?? true}
          onChange={(v) => update({ confirmBeforeDelete: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Reduce motion"
        description="Disables most animations and transitions"
      >
        <div className="flex items-center gap-3">
          {needsRestartForMotion && (
            <Button
              variant="base"
              className="text-xs px-2 py-1 text-[var(--accent-600)] dark:text-[var(--accent-400)]"
              onClick={() =>
                window.electronAPI?.restartApp?.() || window.location.reload()
              }
            >
              Restart to apply
            </Button>
          )}
          <Toggle
            checked={settings.reduceMotion ?? false}
            onChange={(v) => {
              update({ reduceMotion: v });
              setNeedsRestartForMotion(true);
            }}
          />
        </div>
      </SettingsRow>
      <SettingsRow
        label="Show Image Size"
        description="Display the file size of an image below the timestamp"
      >
        <Toggle
          checked={settings.showImageSize ?? false}
          onChange={(v) => update({ showImageSize: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Show Image File Name"
        description="Display the file name of an image below the image"
      >
        <Toggle
          checked={settings.showImageFileName ?? false}
          onChange={(v) => update({ showImageFileName: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Hide Notes During Size Filter"
        description="Hide text notes and links when using the size: search operator"
      >
        <Toggle
          checked={settings.hideNotesWhenFilteringBySize ?? false}
          onChange={(v) => update({ hideNotesWhenFilteringBySize: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Florence Image Description"
        description={`Use a highly-capable on-device vision model to generate rich descriptions for images (Approx ~200MB download). WARNING: This will significantly slow down the time it takes to process images. Turn off to use basic text detection.${modelSize ? ` Currently using ${(modelSize / 1024 / 1024).toFixed(1)} MB.` : ""}`}
      >
        <div className="flex items-center gap-3">
          {modelSize !== null && modelSize > 0 && (
            <Button
              variant="base"
              className="text-xs px-2 py-1 text-red-600 dark:text-red-400"
              onClick={async () => {
                if (settings.useFlorence) update({ useFlorence: false });

                try {
                  const keys = await caches.keys();
                  const hfCache = keys.find((k) =>
                    k.includes("transformers-cache"),
                  );
                  if (hfCache) {
                    const cache = await caches.open(hfCache);
                    const requests = await cache.keys();
                    // Just delete the Florence-2 ones so we don't wipe other models if the user has them
                    for (const req of requests) {
                      if (req.url.includes("Florence-2")) {
                        await cache.delete(req);
                      }
                    }
                  }
                  setModelSize(0);
                  alert(
                    "Florence successfully uninstalled from browser cache.",
                  );
                } catch (e) {
                  console.error("Failed to clear model cache:", e);
                }
              }}
            >
              Uninstall Model
            </Button>
          )}

          <Button
            variant={settings.useFlorence ? "base" : "primary"}
            className="text-xs px-2 py-1"
            onClick={() => {
              if (!settings.useFlorence) {
                update({ useFlorence: true });
              } else {
                update({ useFlorence: false });
              }
            }}
          >
            {settings.useFlorence ? "Disable" : "Install & Enable"}
          </Button>
        </div>
      </SettingsRow>
    </div>
  );
}

function StorageSection() {
  const [dataLocation, setDataLocation] = useState<string>("Loading...");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  useEffect(() => {
    window.electronAPI
      ?.getStoragePath()
      .then((path: string) => setDataLocation(path))
      .catch(() => setDataLocation("Unknown"));
  }, []);

  const handleChangeLocation = async () => {
    try {
      const result = await window.electronAPI?.changeStoragePath();
      if (result?.success && result.path) {
        setDataLocation(result.path);
        alert("Data successfully moved to the new location!");
      } else if (result?.error) {
        alert(`Failed to move data: ${result.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred trying to change the storage location.");
    }
  };

  const handleOpenTrash = async () => {
    try {
      const result = await window.electronAPI?.openTrashFolder();
      if (result && !result.success) {
        alert(`Failed to open trash: ${result.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred trying to open the trash folder.");
    }
  };

  const handleClearData = async () => {
    try {
      if (clearConfirmText !== "Clear all my data") return;

      const result = await window.electronAPI?.clearAllData();
      if (result?.success) {
        alert("All data has been permanently deleted.");
        setShowClearConfirm(false);
        setClearConfirmText("");
        // Reload to safely reflect empty state natively
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to clear data.");
    }
  };

  return (
    <div className="space-y-4 p-2 pb-6">
      <div className="p-4">
        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Data Location
        </h4>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 block truncate">
          {dataLocation}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="base"
            className="text-xs px-3 py-1.5"
            onClick={handleChangeLocation}
          >
            Change location...
          </Button>
          <Button
            variant="base"
            className="text-xs px-3 py-1.5"
            onClick={handleOpenTrash}
          >
            Open trash folder
          </Button>
        </div>
      </div>

      {/* <div className="p-4">
        <h4 className="font-semibold text-red-900 dark:text-red-400">
          Danger Zone
        </h4>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1 mb-4">
          Permanently delete all your items and clear the application data. This
          cannot be undone.
        </p>

        {!showClearConfirm ? (
          <Button
            variant="danger"
            className="text-xs px-3 py-1.5"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear all data
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-red-800 dark:text-red-300">
              Type{" "}
              <strong className="font-bold select-all">
                Clear all my data
              </strong>{" "}
              below to confirm.
            </p>
            <input
              type="text"
              className={clsx(
                "w-full rounded border px-3 py-1.5 text-sm outline-none transition-colors",
                "border-red-200 bg-white text-neutral-900 focus:border-red-500",
                "dark:border-red-900/50 dark:bg-neutral-900 dark:text-white dark:focus:border-red-500",
              )}
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="Clear all my data"
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                className="text-xs px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={clearConfirmText !== "Clear all my data"}
                onClick={handleClearData}
              >
                Permanently Delete
              </Button>
              <Button
                variant="base"
                className="text-xs px-3 py-1.5 bg-neutral-200/50 dark:bg-neutral-800"
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearConfirmText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
}

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

const defaultUpdateStatus: UpdateStatusPayload = { state: "idle" };

function formatUpdateError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("Cannot parse releases feed") ||
    msg.includes("HttpError: 406") ||
    msg.includes("Method Not Allowed")
  ) {
    return "Unable to check for updates. Please ensure a production release exists.";
  }
  return msg;
}

function getUpdateStatusText(status: UpdateStatusPayload): string {
  switch (status.state) {
    case "idle":
      return "Update status: idle.";
    case "checking":
      return status.message ?? "Checking for updates...";
    case "update-available":
      if (status.message) return status.message;
      return status.availableVersion
        ? `Update v${status.availableVersion} is available.`
        : "An update is available.";
    case "no-update":
      return status.message ?? "Vaulty is up to date.";
    case "downloading":
      return status.percent !== undefined
        ? `Downloading update... ${status.percent.toFixed(1)}%`
        : (status.message ?? "Downloading update...");
    case "downloaded":
      return status.message ?? "Update downloaded. Restart to install.";
    case "disabled-in-dev":
      return (
        status.message ??
        "Updates are disabled in dev mode. Package the app to test updates."
      );
    case "error":
      return status.message ?? "Failed to update.";
    default:
      return "Unknown update state.";
  }
}

function AboutSection() {
  const [appVersion, setAppVersion] = useState("unknown");
  const [updateStatus, setUpdateStatus] =
    useState<UpdateStatusPayload>(defaultUpdateStatus);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    let unsubscribe: (() => void) | undefined;

    api
      .getVersion()
      .then((version: string) => setAppVersion(version))
      .catch(() => setAppVersion("unknown"));

    api
      .getUpdateStatus()
      .then((status: UpdateStatusPayload) => setUpdateStatus(status))
      .catch(() => setUpdateStatus(defaultUpdateStatus));

    // eslint-disable-next-line prefer-const
    unsubscribe = api.onUpdateStatus((status: UpdateStatusPayload) => {
      setUpdateStatus(status);
    });

    return () => unsubscribe?.();
  }, []);

  const isChecking = updateStatus.state === "checking";
  const isDownloading = updateStatus.state === "downloading";
  const isBusy = isChecking || isDownloading;
  const canDownload = updateStatus.state === "update-available";
  const isDevDisabled = updateStatus.state === "disabled-in-dev";
  const canRestart = updateStatus.state === "downloaded";
  const progress = Math.min(100, Math.max(0, updateStatus.percent ?? 0));

  const handleCheckForUpdates = async () => {
    try {
      const result = await window.electronAPI?.checkForUpdates();
      if (
        result &&
        !result.ok &&
        "reason" in result &&
        result.reason === "disabled-in-dev"
      ) {
        setUpdateStatus({
          state: "disabled-in-dev",
          message:
            "Updates are disabled in dev mode. Package the app to test updates.",
        });
      }
    } catch (error) {
      setUpdateStatus({
        state: "error",
        message: formatUpdateError(error),
      });
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      const result = await window.electronAPI?.downloadUpdate();
      if (
        result &&
        !result.ok &&
        "reason" in result &&
        result.reason === "disabled-in-dev"
      ) {
        setUpdateStatus({
          state: "disabled-in-dev",
          message:
            "Updates are disabled in dev mode. Package the app to test updates.",
        });
      }
    } catch (error) {
      setUpdateStatus({
        state: "error",
        message: formatUpdateError(error),
      });
    }
  };

  const handleInstallUpdate = async () => {
    try {
      const result = await window.electronAPI?.installUpdate();
      if (
        result &&
        !result.ok &&
        "reason" in result &&
        result.reason === "disabled-in-dev"
      ) {
        setUpdateStatus({
          state: "disabled-in-dev",
          message:
            "Updates are disabled in dev mode. Package the app to test updates.",
        });
      }
    } catch (error) {
      setUpdateStatus({
        state: "error",
        message: formatUpdateError(error),
      });
    }
  };

  return (
    <div className="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Vaulty
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Version {appVersion}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckForUpdates}
            disabled={isBusy || isDevDisabled}
            className={clsx(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              "border-neutral-300 bg-white text-neutral-700",
              "hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:dark:hover:bg-neutral-700",
            )}
          >
            Check for updates
          </button>
          {canDownload && (
            <button
              onClick={handleDownloadUpdate}
              disabled={isBusy || isDevDisabled}
              className={clsx(
                "rounded-lg bg-[var(--accent-600)] px-3 py-1.5 text-sm font-medium text-white transition-opacity",
                "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-100",
              )}
            >
              Download update
            </button>
          )}
          {canRestart && (
            <button
              onClick={handleInstallUpdate}
              disabled={isDevDisabled}
              className={clsx(
                "rounded-lg bg-[var(--accent-600)] px-3 py-1.5 text-sm font-medium text-white transition-opacity",
                "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-100",
              )}
            >
              Restart to update
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        {getUpdateStatusText(updateStatus)}
      </p>

      {isDownloading && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded bg-neutral-300 dark:bg-neutral-700">
            <div
              className="h-full bg-[var(--accent-600)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {progress.toFixed(1)}%
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        A local-first scrapbook for screenshots, notes, links, and reminders.
      </p>
    </div>
  );
}

function GuideSection() {
  return (
    <div className="space-y-4 p-2 pb-6">
      <div className="p-4">
        <h4 className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
          Search Operators
        </h4>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Vaulty supports powerful search operators to filter your items. Type
          these directly into the search bar:
        </p>

        <div className="space-y-4 text-sm">
          <div>
            <code className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[var(--accent-600)] dark:text-[var(--accent-400)] font-mono text-[11px]">
              date:YYYY-MM-DD
            </code>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Find items created on an exact date.
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Example: <code className="font-mono">date:2025-02-19</code>
            </p>
          </div>

          <div>
            <code className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[var(--accent-600)] dark:text-[var(--accent-400)] font-mono text-[11px]">
              size:&lt;amount&gt;&lt;unit&gt;
            </code>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Find images smaller than a specific size. Supports <code>kb</code>
              , <code>mb</code>, and <code>gb</code>.
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Example: <code className="font-mono">size:&lt;200mb</code>
            </p>
          </div>

          <div>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              Natural Time Filters
            </span>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Filter items by relative time. You can use phrases like{" "}
              <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                today
              </code>
              ,{" "}
              <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                yesterday
              </code>
              ,{" "}
              <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                last week
              </code>
              ,{" "}
              <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                last month
              </code>
              , or{" "}
              <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                from 3 days ago
              </code>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-neutral-100 px-4 py-4 dark:bg-neutral-800">
        <h4 className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
          Markdown Formatting
        </h4>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          Format your text items using simple markdown:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-1.5">
          <li>
            <strong>Headers:</strong>{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              # Header
            </code>{" "}
            or{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              ## Smaller
            </code>
          </li>
          <li>
            <strong>Lists:</strong>{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              - Item
            </code>{" "}
            or{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              1. Item
            </code>
          </li>
          <li>
            <strong>Links:</strong>{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              [Title](https://url.com)
            </code>
          </li>
          <li>
            <strong>Quotes:</strong>{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              &gt; Quote
            </code>{" "}
            or{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              &gt;&gt;&gt; Multi-line
            </code>
          </li>
          <li>
            <strong>Code blocks:</strong>{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              `inline`
            </code>{" "}
            or{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              ```block```
            </code>
          </li>
          <li>
            <strong>Subtext:</strong>{" "}
            <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
              -# small text
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}

const sectionContent: Record<SectionId, React.FC> = {
  appearance: AppearanceSection,
  behavior: BehaviorSection,
  storage: StorageSection,
  guide: GuideSection,
  about: AboutSection,
};

// -- Modal --

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("appearance");
  const modalRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const reduceMotion = settings.reduceMotion ?? false;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const ActiveContent = sectionContent[activeSection];
  const activeLabel = sections.find((s) => s.id === activeSection)?.label ?? "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/5"
          onClick={handleBackdropClick}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <motion.div
            key="settings-panel"
            ref={modalRef}
            className={clsx(
              "relative flex h-[70vh] w-full max-w-3xl overflow-hidden rounded-xl border",
              "bg-white/75 dark:bg-neutral-900/85",
              "transparent:bg-neutral-100/95 transparent:dark:bg-neutral-900/95",
              "border-neutral-200 dark:border-neutral-700",
              "transparent:border-white/25 transparent:dark:border-white/10",
              "backdrop-blur-[24px]",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            style={{ boxShadow: "var(--shadow-1)" }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Sidebar */}
            <nav
              className={clsx(
                "flex w-52 shrink-0 flex-col border-r",
                "bg-white/0 dark:bg-black/0",
                "border-neutral-200 dark:border-neutral-700",
              )}
            >
              <div className="px-5 pt-5 pb-3">
                <h2
                  id="settings-title"
                  className="text-2xl select-none font-bold text-neutral-900 dark:text-neutral-100"
                >
                  Settings
                </h2>
              </div>

              <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
                {sections.map((section) => {
                  const isActive = section.id === activeSection;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex select-none items-center gap-2.5 rounded-lg px-3 py-1.5 compact:px-2 compact:py-1 text-left text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--accent-600)] text-white"
                          : "text-neutral-700 hover:bg-neutral-200/70 transparent:hover:bg-white/50 dark:text-neutral-300 dark:hover:bg-white/5 transparent:dark:hover:bg-white/5"
                      }`}
                    >
                      <SFIcon
                        icon={section.icon}
                        size={18}
                        weight={0.1}
                        className={`compact:scale-[0.9] ${isActive ? "text-white" : "text-neutral-500 dark:text-neutral-400"}`}
                      />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-neutral-800">
              {/* Section header */}
              <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
                <h3 className="text-base select-none font-semibold text-neutral-900 dark:text-neutral-100">
                  {activeLabel}
                </h3>
                <button
                  onClick={onClose}
                  className={clsx(
                    "rounded-full flex items-center justify-center size-7 -mr-2",
                    "transition-colors cursor-pointer",
                    "text-neutral-400 hover:text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-200",
                    "bg-black/10 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15",
                  )}
                  aria-label="Close settings"
                >
                  <SFIcon icon={sfXmark} size={12} weight={1} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-2">
                <ActiveContent />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
