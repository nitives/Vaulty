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
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfXmark } from "@bradleyhodges/sfsymbols";
import { motion, AnimatePresence } from "motion/react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// -- Sidebar sections --

type SectionId = "appearance" | "behavior" | "storage" | "guide" | "about";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: IconName;
}

const sections: SectionDef[] = [
  { id: "appearance", label: "Appearance", icon: "paintbrush" },
  { id: "behavior", label: "Behavior", icon: "sliderHorizontal3" },
  { id: "storage", label: "Storage", icon: "internaldrive" },
  { id: "guide", label: "Guide", icon: "bookClosed" },
  { id: "about", label: "About", icon: "infoCircle" },
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
        <Toggle
          checked={settings.reduceMotion ?? false}
          onChange={(v) => update({ reduceMotion: v })}
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
        label="Show Image Size"
        description="Display the file size of images next to their timestamp"
      >
        <Toggle
          checked={settings.showImageSize ?? false}
          onChange={(v) => update({ showImageSize: v })}
        />
      </SettingsRow>
    </div>
  );
}

function StorageSection() {
  return (
    <div className="space-y-2">
      <SettingsRow
        label="Data location"
        description="Where your items are stored"
      >
        <button className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600">
          Change
        </button>
      </SettingsRow>
      <SettingsRow
        label="Clear all data"
        description="Delete all saved items permanently"
      >
        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700">
          Clear Data
        </button>
      </SettingsRow>
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
      .then((version) => setAppVersion(version))
      .catch(() => setAppVersion("unknown"));

    api
      .getUpdateStatus()
      .then((status) => setUpdateStatus(status))
      .catch(() => setUpdateStatus(defaultUpdateStatus));

    // eslint-disable-next-line prefer-const
    unsubscribe = api.onUpdateStatus((status) => {
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
        message: error instanceof Error ? error.message : String(error),
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
        message: error instanceof Error ? error.message : String(error),
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
        message: error instanceof Error ? error.message : String(error),
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
      <div className="rounded-lg bg-neutral-100 px-4 py-4 dark:bg-neutral-800">
        <h4 className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Search Operators</h4>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Vaulty supports powerful search operators to filter your items. Type these directly into the search bar:
        </p>
        
        <div className="space-y-4 text-sm">
          <div>
            <code className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[var(--accent-600)] dark:text-[var(--accent-400)] font-mono text-[11px]">date:YYYY-MM-DD</code>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">Find items created on an exact date.</p>
            <p className="text-xs text-neutral-500 mt-1">Example: <code className="font-mono">date:2025-02-19</code></p>
          </div>
          
          <div>
            <code className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[var(--accent-600)] dark:text-[var(--accent-400)] font-mono text-[11px]">size:&lt;amount&gt;&lt;unit&gt;</code>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">Find images smaller than a specific size. Supports <code>kb</code>, <code>mb</code>, and <code>gb</code>.</p>
            <p className="text-xs text-neutral-500 mt-1">Example: <code className="font-mono">size:&lt;200mb</code></p>
          </div>
          
          <div>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">Natural Time Filters</span>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Filter items by relative time. You can use phrases like <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">today</code>, <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">yesterday</code>, <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">last week</code>, <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">last month</code>, or <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">from 3 days ago</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-neutral-100 px-4 py-4 dark:bg-neutral-800">
        <h4 className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Markdown Formatting</h4>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          Format your text items using simple markdown:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-1.5">
          <li><strong>Headers:</strong> <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200"># Header</code> or <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">## Smaller</code></li>
          <li><strong>Lists:</strong> <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">- Item</code> or <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">1. Item</code></li>
          <li><strong>Links:</strong> <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">[Title](https://url.com)</code></li>
          <li><strong>Quotes:</strong> <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">&gt; Quote</code> or <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">&gt;&gt;&gt; Multi-line</code></li>
          <li><strong>Code blocks:</strong> <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">`inline`</code> or <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">```block```</code></li>
          <li><strong>Subtext:</strong> <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">-# small text</code></li>
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
                "flex w-52 flex-shrink-0 flex-col border-r",
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
                      className={`flex select-none items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--accent-600)] text-white"
                          : "text-neutral-700 hover:bg-neutral-200/70 transparent:hover:bg-white/50 dark:text-neutral-300 dark:hover:bg-white/5 transparent:dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon
                        name={section.icon}
                        className={`text-[16px] ${isActive ? "text-white" : "text-neutral-500 dark:text-neutral-400"}`}
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
