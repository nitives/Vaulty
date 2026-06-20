"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  useSettings,
  type AccentColor,
  type AppIconTheme,
  type VaultBackupFrequency,
  type VaultBackupRetention,
} from "@/lib/settings";
import { Toggle } from "./ui/Toggle";
import { Select } from "./ui/Select";
import { AccentColorPicker } from "./ui/AccentColorPicker";
import { Slider } from "./ui/Slider";
import { Button } from "./ui/Button";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import {
  sfArrowLeft,
  sfBookClosed,
  sfCheckmarkIcloud,
  sfFlask,
  sfInfoCircle,
  sfIcloud,
  sfInternaldrive,
  sfPaintbrush,
  sfSliderHorizontal3,
} from "@bradleyhodges/sfsymbols";
import { motion, AnimatePresence } from "motion/react";
import { IconDefinition } from "@bradleyhodges/sfsymbols-types";
import { getElectronAPI } from "@/lib/electron";
import { useAuth } from "@/lib/auth";
import { syncVaultNow } from "@/lib/storage";
import {
  type BillingEntitlements,
  type BillingPlanId,
  getBillingEntitlements,
  hasBillingSyncAccess,
  isBillingEntitlementActive,
  openCheckout,
  openCustomerPortal,
} from "@/lib/billing";

interface SettingsScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

// -- Sidebar sections --

type SectionId =
  | "appearance"
  | "behavior"
  | "sync"
  | "storage"
  | "guide"
  | "experiments"
  | "about";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: IconDefinition;
}

const sections: SectionDef[] = [
  { id: "appearance", label: "Appearance", icon: sfPaintbrush },
  { id: "behavior", label: "Behavior", icon: sfSliderHorizontal3 },
  { id: "sync", label: "Sync", icon: sfIcloud },
  { id: "storage", label: "Storage", icon: sfInternaldrive },
  { id: "guide", label: "Guide", icon: sfBookClosed },
  { id: "experiments", label: "Experiments", icon: sfFlask },
  { id: "about", label: "About", icon: sfInfoCircle },
];

const sectionGroups: Array<{ label: string; sectionIds: SectionId[] }> = [
  {
    label: "General",
    sectionIds: ["appearance", "behavior", "sync", "storage"],
  },
  { label: "Reference", sectionIds: ["guide", "experiments", "about"] },
];

// -- Reusable settings row --

interface SettingsRowProps {
  label: string;
  sublabel?: string;
  description?: string;
  children: React.ReactNode;
  toggleOnRowClick?: boolean;
}

function SettingsRow({
  label,
  sublabel,
  description,
  children,
  toggleOnRowClick = false,
}: SettingsRowProps) {
  const { settings } = useSettings();
  const isRowToggleEnabled =
    toggleOnRowClick && Boolean(settings.experiments?.["entire-row-clickable"]);

  const toggleFromRow = (container: HTMLElement) => {
    const toggleButton = container.querySelector<HTMLButtonElement>(
      'button[role="switch"]:not(:disabled)',
    );
    toggleButton?.click();
  };

  return (
    <div
      className={clsx(
        "flex min-h-14 items-center justify-between gap-4 px-4 py-3",
        isRowToggleEnabled &&
          "cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-white/[0.04]",
      )}
      onClick={(e) => {
        if (!isRowToggleEnabled) return;
        const target = e.target as HTMLElement;
        if (
          target.closest(
            "button, a, input, select, textarea, [contenteditable='true'], [data-no-row-toggle='true']",
          )
        ) {
          return;
        }
        toggleFromRow(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (!isRowToggleEnabled) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        toggleFromRow(e.currentTarget);
      }}
      role={isRowToggleEnabled ? "button" : undefined}
      tabIndex={isRowToggleEnabled ? 0 : undefined}
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
          {sublabel && (
            <span className="ml-1 text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {sublabel}
            </span>
          )}
        </p>
        {description && (
          <p className="text-xs text-neutral-500 w-[90%] dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center">{children}</div>
    </div>
  );
}

// -- Section content components --

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="select-none px-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
      {children}
    </p>
  );
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl",
        "bg-neutral-100/90 dark:bg-white/[0.055]",
        "divide-y divide-neutral-200/80 dark:divide-white/[0.075]",
      )}
    >
      {children}
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <SectionLabel>{title}</SectionLabel>
      <SettingsGroup>{children}</SettingsGroup>
    </section>
  );
}

function AppearanceSection() {
  const { settings, update } = useSettings();
  const platform = getElectronAPI()?.getPlatform?.() ?? "";
  const isMac = platform === "darwin";
  const isWindows = platform === "win32";

  return (
    <div className="space-y-7 pb-6">
      <SettingsSection title="General">
        <SettingsRow
          label="Theme"
          description="Choose your preferred color scheme"
        >
          <Select
            value={settings.theme ?? "system"}
            onChange={(v) =>
              update({ theme: v as "system" | "light" | "dark" })
            }
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
              { value: "sunset", label: "Sunset" },
              { value: "midnight", label: "Midnight" },
              { value: "inverted", label: "Inverted" },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Accent color"
          description={
            isWindows || isMac
              ? "Multicolor uses your system accent color"
              : "Choose an accent color for the UI"
          }
        >
          <AccentColorPicker
            value={settings.accentColor ?? "blue"}
            onChange={(v) => update({ accentColor: v as AccentColor })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Layout">
        <SettingsRow
          label="Input bar position"
          description="Place the input bar at the top or bottom of the content area (also reverses the content order)"
        >
          <Select
            value={settings.inputBarPosition ?? "bottom"}
            onChange={(v) =>
              update({ inputBarPosition: v as "top" | "bottom" })
            }
            options={[
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Sidebar icons"
          description="Show icons next to the built-in sidebar sections"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.showSidebarIcons ?? true}
            onChange={(v) => update({ showSidebarIcons: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Compact mode"
          description="Reduce spacing in the UI"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.compactMode ?? false}
            onChange={(v) => update({ compactMode: v })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Customization">
        <SettingsRow
          label="Custom font"
          description="Use a custom font for the UI"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.customFont ?? false}
            onChange={(v) => update({ customFont: v })}
          />
        </SettingsRow>
        {settings.customFont && (
          <SettingsRow
            label="Font family"
            description="Enter the name of an installed system font"
          >
            <input
              type="text"
              value={settings.customFontFamily ?? ""}
              onChange={(e) => update({ customFontFamily: e.target.value })}
              placeholder="e.g. Inter, Cascadia Code"
              spellCheck={false}
              className="w-48 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--accent-500)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-500)] dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
          </SettingsRow>
        )}
        <SettingsRow
          label="Custom CSS"
          description="Inject your own CSS styles from custom.css in your Vaulty folder"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.customCSS ?? false}
            onChange={(v) => update({ customCSS: v })}
          />
        </SettingsRow>
        {settings.customCSS && (
          <div className="overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 select-none">
                CSS
              </span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-1.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
              <textarea
                value={settings.customCSSContent ?? ""}
                onChange={(e) => update({ customCSSContent: e.target.value })}
                placeholder={
                  "/* Your custom styles */\n#vaulty-sidebar {\n  background-color: red;\n}"
                }
                spellCheck={false}
                rows={8}
                className="w-full rounded-b-[2px] resize-y bg-transparent px-3 py-2 font-mono text-xs leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Transparency">
        <SettingsRow
          label="Window transparency"
          description="Enable transparent blur background"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.transparency ?? false}
            onChange={(v) => update({ transparency: v })}
          />
        </SettingsRow>
        {settings.transparency && (
          <>
            <SettingsRow
              label="Transparent titlebar"
              description="Make the titlebar background transparent"
              toggleOnRowClick
            >
              <Toggle
                checked={settings.titlebarTransparent ?? false}
                onChange={(v) => update({ titlebarTransparent: v })}
              />
            </SettingsRow>
            <SettingsRow
              label="Transparent sidebar"
              description="Make the sidebar background transparent"
              toggleOnRowClick
            >
              <Toggle
                checked={settings.sidebarTransparent ?? false}
                onChange={(v) => update({ sidebarTransparent: v })}
              />
            </SettingsRow>
            {isWindows && (
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
          </>
        )}
        {settings.transparency &&
          (isMac ||
            (isWindows && settings.backgroundMaterial === "acrylic")) && (
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
                  onChange={(v) =>
                    update({ backgroundTintOpacityLight: v / 10 })
                  }
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
                  onChange={(v) =>
                    update({ backgroundTintOpacityDark: v / 10 })
                  }
                  ariaLabel="Dark mode tint opacity"
                />
              </SettingsRow>
            </>
          )}
      </SettingsSection>
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
    <div className="space-y-7 pb-6">
      <SettingsSection title="Launch">
        <SettingsRow
          label="Start with sidebar collapsed"
          description="Sidebar will be collapsed on app launch"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.startCollapsed ?? false}
            onChange={(v) => update({ startCollapsed: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Open Vaulty on Startup"
          description="Launch Vaulty automatically when your computer starts"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.openOnStartup ?? false}
            onChange={(v) => {
              update({ openOnStartup: v });
              window.electronAPI?.changeStartupSettings?.(v);
            }}
          />
        </SettingsRow>
        <SettingsRow
          label="Start minimized"
          description="Launch the app in the background when it starts. (Requires 'Open on Startup')"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.startMinimized ?? false}
            disabled={!(settings.openOnStartup ?? false)}
            onChange={(v) => update({ startMinimized: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Close button minimizes to tray"
          description="Keep Vaulty running in the background when closing the window"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.closeToTray ?? true}
            onChange={(v) => update({ closeToTray: v })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Interaction">
        <SettingsRow
          label="Confirm before deleting"
          description="Show confirmation dialog when deleting items"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.confirmBeforeDelete ?? true}
            onChange={(v) => update({ confirmBeforeDelete: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Persist input bar state"
          description="Keep your draft text, tags, and media when switching sidebar filters or pages"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.persistInputBarStateOnSwitch ?? true}
            onChange={(v) => update({ persistInputBarStateOnSwitch: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Use pointer cursors"
          description="Show a pointer cursor when hovering over interactive controls"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.usePointerCursors ?? true}
            onChange={(v) => update({ usePointerCursors: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Reduce motion"
          description="Disables most animations and transitions"
          toggleOnRowClick
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
      </SettingsSection>

      <SettingsSection title="Items">
        <SettingsRow
          label="Show Image Size"
          description="Display the file size of an image below the timestamp"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.showImageSize ?? false}
            onChange={(v) => update({ showImageSize: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Show Image File Name"
          description="Display the file name of an image below the image"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.showImageFileName ?? false}
            onChange={(v) => update({ showImageFileName: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Hide Notes During Size Filter"
          description="Hide text notes and links when using the size: search operator"
          toggleOnRowClick
        >
          <Toggle
            checked={settings.hideNotesWhenFilteringBySize ?? false}
            onChange={(v) => update({ hideNotesWhenFilteringBySize: v })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Image Processing">
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
      </SettingsSection>
    </div>
  );
}

function StorageSection() {
  const { settings, update } = useSettings();
  const [dataLocation, setDataLocation] = useState<string>("Loading...");
  const [backupStatus, setBackupStatus] = useState<{
    frequency: VaultBackupFrequency;
    retention: VaultBackupRetention;
    backupsPath: string;
    lastBackupAt?: string;
  } | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupRetentionInput, setBackupRetentionInput] = useState("5");
  const [isBackingUp, setIsBackingUp] = useState(false);

  const backupRetention =
    backupStatus?.retention ?? settings.vaultBackupRetention ?? 5;
  const backupRetentionIsInfinite = backupRetention === "infinite";

  const loadBackupStatus = async () => {
    try {
      const status = await window.electronAPI?.getVaultBackupStatus?.();
      if (status) {
        setBackupStatus(status);
        if (typeof status.retention === "number") {
          setBackupRetentionInput(String(status.retention));
        }
      }
    } catch {
      setBackupStatus(null);
    }
  };

  useEffect(() => {
    window.electronAPI
      ?.getStoragePath()
      .then((path: string) => setDataLocation(path))
      .catch(() => setDataLocation("Unknown"));
    void loadBackupStatus();
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

  const handleOpenVault = async () => {
    try {
      const result = await window.electronAPI?.openVaultFolder();
      if (result && !result.success) {
        alert(`Failed to open vault: ${result.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred trying to open the vault folder.");
    }
  };

  const handleBackupFrequencyChange = (value: string) => {
    const frequency = value as VaultBackupFrequency;
    update({ vaultBackupFrequency: frequency });
    setBackupStatus((prev) => (prev ? { ...prev, frequency } : prev));
    setBackupMessage(null);
  };

  const updateBackupRetention = (retention: VaultBackupRetention) => {
    update({ vaultBackupRetention: retention });
    setBackupStatus((prev) => (prev ? { ...prev, retention } : prev));
    setBackupMessage(null);
  };

  const normalizeBackupRetentionValue = (rawValue: string): number => {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) ? Math.max(1, parsed) : 5;
  };

  const handleBackupRetentionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawValue = event.target.value;
    setBackupRetentionInput(rawValue);

    if (!rawValue.trim()) return;
    updateBackupRetention(normalizeBackupRetentionValue(rawValue));
  };

  const handleBackupRetentionBlur = () => {
    const normalized = normalizeBackupRetentionValue(backupRetentionInput);
    setBackupRetentionInput(String(normalized));
    updateBackupRetention(normalized);
  };

  const handleInfiniteBackupRetentionChange = (checked: boolean) => {
    if (checked) {
      updateBackupRetention("infinite");
      return;
    }

    const normalized = normalizeBackupRetentionValue(backupRetentionInput);
    setBackupRetentionInput(String(normalized));
    updateBackupRetention(normalized);
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setBackupMessage(null);

    try {
      if (!window.electronAPI?.createVaultBackup) {
        setBackupMessage("Restart Vaulty to finish enabling backups.");
        return;
      }

      const result = await window.electronAPI.createVaultBackup();
      if (result?.success) {
        setBackupMessage("Backup complete.");
        await loadBackupStatus();
      } else {
        setBackupMessage(result?.error ?? "Backup failed.");
      }
    } catch (err) {
      setBackupMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBackingUp(false);
    }
  };

  const lastBackupLabel = backupStatus?.lastBackupAt
    ? new Date(backupStatus.lastBackupAt).toLocaleString()
    : "No backup yet";
  const backupRetentionDescription = backupRetentionIsInfinite
    ? "Keeps every backup copy"
    : `Keeps the newest ${backupRetention} backup copies`;

  return (
    <div className="space-y-7 pb-6">
      <SettingsSection title="Data">
        <div className="px-4 py-3">
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
              onClick={handleOpenVault}
            >
              Open vault folder
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
      </SettingsSection>

      <SettingsSection title="Backups">
        <SettingsRow
          label="Backup copies"
          description={
            backupStatus?.backupsPath ?? "Stored in the vault folder"
          }
        >
          <Select
            value={
              backupStatus?.frequency ?? settings.vaultBackupFrequency ?? "off"
            }
            onChange={handleBackupFrequencyChange}
            options={[
              { value: "off", label: "Off" },
              { value: "hourly", label: "Every hour" },
              { value: "daily", label: "Every day" },
              { value: "weekly", label: "Every week" },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Copies to keep"
          description={backupRetentionDescription}
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={backupRetentionIsInfinite ? "" : backupRetentionInput}
              onChange={handleBackupRetentionChange}
              onBlur={handleBackupRetentionBlur}
              disabled={backupRetentionIsInfinite}
              className="h-8 w-20 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-500 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:focus:border-white/25"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Infinite
              </span>
              <Toggle
                checked={backupRetentionIsInfinite}
                onChange={handleInfiniteBackupRetentionChange}
              />
            </div>
          </div>
        </SettingsRow>
        <SettingsRow
          label="Last backup"
          description={backupMessage ?? lastBackupLabel}
        >
          <Button
            variant="base"
            className="px-3 py-1.5 text-xs"
            onClick={handleBackupNow}
            disabled={isBackingUp}
          >
            {isBackingUp ? "Backing up..." : "Back up now"}
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

const billingPlanOptions: Array<{
  id: BillingPlanId;
  label: string;
  sublabel?: string;
  price: string;
  description: string;
  actionLabel: string;
  features: string[];
}> = [
  {
    id: "sync_monthly",
    label: "Vaulty Sync",
    sublabel: "Monthly",
    price: "$1/mo",
    description: "Cloud sync billed monthly.",
    actionLabel: "Subscribe",
    features: [
      "Live sync across signed-in devices",
      "Images, audio, and metadata included",
      "Cross-platform vault restore",
    ],
  },
  {
    id: "sync_yearly",
    label: "Vaulty Sync",
    sublabel: "Save 33%",
    price: "$8/yr",
    description: "Cloud sync billed yearly.",
    actionLabel: "Subscribe",
    features: [
      "Everything in monthly sync",
      "Best price for keeping sync on",
      "Same live database updates",
    ],
  },
  {
    id: "supporter",
    label: "Supporter role",
    sublabel: "Role",
    price: "$2.99",
    description: "Support Vaulty devs.",
    actionLabel: "Support",
    features: [
      "Unlocks all sync features",
      "Support ongoing Vaulty development",
      "Supporter role on your account",
    ],
  },
];

const billingPlanLabels: Record<string, string> = {
  sync: "Vaulty Sync",
  sync_monthly: "Vaulty Sync monthly",
  sync_yearly: "Vaulty Sync yearly",
  supporter: "Supporter role",
};

function formatBillingDate(value?: string | null): string | null {
  if (!value) return null;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed));
}

function describeBillingEntitlements(
  entitlements: BillingEntitlements,
): string {
  const active: string[] = [];

  if (isBillingEntitlementActive(entitlements.sync)) {
    const plan = entitlements.sync?.plan ?? "sync_monthly";
    const label = billingPlanLabels[plan] ?? "Vaulty Sync";
    const activeUntil = formatBillingDate(entitlements.sync?.active_until);
    active.push(
      activeUntil
        ? `${label} active through ${activeUntil}`
        : `${label} active`,
    );
  }

  if (isBillingEntitlementActive(entitlements.supporter)) {
    const activeUntil = formatBillingDate(entitlements.supporter?.active_until);
    active.push(
      activeUntil
        ? `Supporter role active through ${activeUntil}`
        : "Supporter role active",
    );
  }

  return active.length > 0
    ? active.join(" + ")
    : "Choose any role below to enable sync.";
}

function isBillingPlanActive(
  plan: BillingPlanId,
  entitlements: BillingEntitlements,
): boolean {
  if (plan === "supporter") {
    return isBillingEntitlementActive(entitlements.supporter);
  }

  if (!isBillingEntitlementActive(entitlements.sync)) return false;

  const activePlan =
    entitlements.sync?.plan === "sync_yearly" ? "sync_yearly" : "sync_monthly";

  return activePlan === plan;
}

function SyncSection() {
  const {
    session,
    isConfigured,
    isLoading,
    error: authError,
    signIn,
    signUp,
    signOut,
  } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [entitlements, setEntitlements] = useState<BillingEntitlements>({
    sync: null,
    supporter: null,
  });
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isBillingBusy, setIsBillingBusy] = useState(false);

  const refreshBillingEntitlements = useCallback(async () => {
    if (!session) {
      setEntitlements({ sync: null, supporter: null });
      setBillingStatus(null);
      setIsBillingLoading(false);
      return;
    }

    setIsBillingLoading(true);
    try {
      const nextEntitlements = await getBillingEntitlements();
      setEntitlements(nextEntitlements);
      setBillingStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setBillingStatus(`Billing status failed to fetch: ${message}`);
    } finally {
      setIsBillingLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refreshBillingEntitlements();
  }, [refreshBillingEntitlements]);

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        await signIn(email.trim(), password);
        setStatus("Signed in.");
      } else {
        const nextSession = await signUp(email.trim(), password);
        setStatus(
          nextSession
            ? "Account created."
            : "Check your email to confirm the account, then sign in.",
        );
      }
      setPassword("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncNow = async () => {
    setStatus(null);

    if (isBillingLoading) {
      setStatus("Checking billing status.");
      return;
    }

    if (!hasBillingSyncAccess(entitlements)) {
      setStatus("Sync requires an active Vaulty Sync plan or Supporter role.");
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncVaultNow();
      if (!result.success) {
        setStatus(result.error ?? "Sync failed.");
        return;
      }

      setStatus(
        `Synced ${result.pushed} records. Pulled ${result.pulled}, removed ${result.deleted}.${
          result.mediaErrors?.length
            ? ` Media issues: ${result.mediaErrors.length}.`
            : ""
        }`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckout = async (plan: BillingPlanId) => {
    setBillingStatus(null);
    setIsBillingBusy(true);
    try {
      await openCheckout(plan);
      setBillingStatus(
        "Checkout opened. Finish in Stripe, then refresh billing.",
      );
    } catch (err) {
      setBillingStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBillingBusy(false);
    }
  };

  const handleCustomerPortal = async () => {
    setBillingStatus(null);
    setIsBillingBusy(true);
    try {
      await openCustomerPortal();
      setBillingStatus("Billing portal opened.");
    } catch (err) {
      setBillingStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBillingBusy(false);
    }
  };

  const hasSyncAccess = useMemo(
    () => hasBillingSyncAccess(entitlements),
    [entitlements],
  );
  const billingSummary = useMemo(
    () => describeBillingEntitlements(entitlements),
    [entitlements],
  );
  const billingControlClassName =
    "px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50";

  const inputClassName = clsx(
    "h-9 rounded-lg border px-3 text-sm outline-none transition-colors",
    "border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400",
    "focus:border-neutral-500 dark:border-white/10 dark:bg-white/[0.07]",
    "dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white/25",
  );

  const authForm = (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("sign-in")}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "sign-in"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
              : "bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign-up")}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "sign-up"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
              : "bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300",
          )}
        >
          Create account
        </button>
      </div>

      <form className="grid gap-3" onSubmit={handleAuthSubmit}>
        <input
          className={inputClassName}
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className={inputClassName}
          type="password"
          autoComplete={
            mode === "sign-in" ? "current-password" : "new-password"
          }
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />
        <div className="flex items-center justify-between gap-3">
          <p className="min-h-5 text-xs text-neutral-500 dark:text-neutral-400">
            {status ?? authError ?? ""}
          </p>
          <Button
            variant="primary"
            className="px-3 py-1.5 text-xs"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Working..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );

  if (!isConfigured) {
    return (
      <div className="space-y-7 pb-6">
        <SettingsSection title="Account">
          <SettingsRow
            label="Supabase"
            description="Add Supabase environment values before signing in"
          >
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Not configured
            </span>
          </SettingsRow>
        </SettingsSection>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-7 pb-6">
        <section className="space-y-4">
          <div className="space-y-2 px-1 text-center">
            <h2 className="text-2xl font-semibold text-neutral-950 dark:text-white">
              Upgrade Vaulty
            </h2>
            <p className="mx-auto max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
              Sign in to unlock live sync for your vault, images, audio,
              metadata, and cross-platform restore.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {billingPlanOptions.map((plan, index) => {
              const highlighted = index === 0;
              const [priceAmount, priceCadence] = plan.price.split("/");
              const displayAmount = priceAmount.replace("$", "");

              return (
                <div
                  key={plan.id}
                  className={clsx(
                    "grid min-h-[24rem] grid-rows-[8rem_auto_1fr] gap-4 rounded-2xl px-4 py-4 pr-3.5 transition-colors",
                    highlighted
                      ? "bg-[linear-gradient(206deg,var(--accent-600)_0%,var(--accent-500)_56%,var(--accent-700)_100%)] text-white shadow-sm"
                      : "bg-neutral-100/90 text-neutral-950 dark:bg-white/[0.065] dark:text-white",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        className={clsx(
                          "min-w-0 text-lg font-semibold leading-tight",
                          highlighted
                            ? "text-white"
                            : "text-neutral-900 dark:text-neutral-100",
                        )}
                      >
                        {plan.label}
                      </h3>
                      {plan.sublabel && (
                        <span
                          className={clsx(
                            "rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-wide",
                            highlighted
                              ? "bg-white/15 text-white"
                              : "bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300",
                          )}
                        >
                          {plan.sublabel}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-end">
                      <span
                        className={clsx(
                          "mb-2 text-xl font-medium",
                          highlighted
                            ? "text-white/70"
                            : "text-neutral-500 dark:text-neutral-400",
                        )}
                      >
                        $
                      </span>
                      <span className="text-5xl font-semibold leading-none">
                        {displayAmount}
                      </span>
                      {priceCadence && (
                        <span
                          className={clsx(
                            "mb-1.5 text-xs font-medium",
                            highlighted
                              ? "text-white/70"
                              : "text-neutral-500 dark:text-neutral-400",
                          )}
                        >
                          /{priceCadence}
                        </span>
                      )}
                    </div>

                    <p
                      className={clsx(
                        "mt-4 text-sm font-medium leading-5",
                        highlighted
                          ? "text-white/85"
                          : "text-neutral-700 dark:text-neutral-300",
                      )}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("sign-up");
                      setStatus(null);
                    }}
                    className={clsx(
                      "h-10 w-full rounded-full text-sm font-semibold transition-colors",
                      highlighted
                        ? "bg-white text-[var(--accent-700)] hover:bg-white/90"
                        : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200",
                    )}
                  >
                    Create account
                  </button>

                  <ul className="space-y-3 pt-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={clsx(
                          "flex gap-3 text-xs leading-5",
                          highlighted
                            ? "text-white/85"
                            : "text-neutral-600 dark:text-neutral-400",
                        )}
                      >
                        <span
                          className={clsx(
                            "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md",
                            highlighted
                              ? "bg-white/14 text-white"
                              : "bg-neutral-200 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
                          )}
                        >
                          <SFIcon icon={sfCheckmarkIcloud} size={12} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <SettingsSection title="Account">{authForm}</SettingsSection>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-6">
      <SettingsSection title="Account">
        <>
          <SettingsRow
            label="Signed in"
            description={session.user.email ?? session.user.id}
          >
            <div className="flex items-center gap-2">
              <Button
                variant="base"
                className={billingControlClassName}
                onClick={handleSyncNow}
                disabled={isSyncing || isBillingLoading || !hasSyncAccess}
              >
                {isSyncing ? "Syncing..." : "Sync now"}
              </Button>
              <Button
                variant="base"
                className="px-3 py-1.5 text-xs"
                onClick={() => {
                  void signOut();
                }}
              >
                Sign out
              </Button>
            </div>
          </SettingsRow>
          <SettingsRow
            label="Status"
            description={
              status ??
              authError ??
              (isLoading
                ? "Checking account..."
                : hasSyncAccess
                  ? "Sync enabled"
                  : "Subscription required")
            }
          >
            <SFIcon icon={sfCheckmarkIcloud} size={18} />
          </SettingsRow>
        </>
      </SettingsSection>

      <SettingsSection title="Billing">
        <SettingsRow
          label={hasSyncAccess ? "Sync access" : "Choose a role"}
          description={
            billingStatus ??
            (isBillingLoading ? "Checking billing status..." : billingSummary)
          }
        >
          {hasSyncAccess ? (
            <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          ) : (
            <span className="rounded-md bg-neutral-500/15 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Inactive
            </span>
          )}
        </SettingsRow>
        {billingPlanOptions.map((plan) => {
          const isActive = isBillingPlanActive(plan.id, entitlements);
          const buttonLabel = isActive
            ? "Active"
            : session
              ? hasSyncAccess
                ? "Manage"
                : plan.actionLabel
              : "Sign in";
          const handlePlanAction = hasSyncAccess
            ? handleCustomerPortal
            : () => handleCheckout(plan.id);

          return (
            <SettingsRow
              key={plan.id}
              label={plan.label}
              sublabel={`(${plan.price})`}
              description={plan.description}
            >
              <Button
                variant={isActive ? "primary" : "base"}
                className={billingControlClassName}
                onClick={handlePlanAction}
                disabled={
                  !session || isBillingBusy || isBillingLoading || isActive
                }
              >
                {buttonLabel}
              </Button>
            </SettingsRow>
          );
        })}
        <SettingsRow
          label={hasSyncAccess ? "Manage billing" : "Billing status"}
          description={
            hasSyncAccess
              ? "Cancel, update payment, or view invoices in Stripe."
              : session
                ? "Refresh after finishing checkout."
                : "Sign in to subscribe."
          }
        >
          <div className="flex items-center gap-2">
            <Button
              variant="base"
              className={billingControlClassName}
              onClick={() => {
                void refreshBillingEntitlements();
              }}
              disabled={!session || isBillingBusy || isBillingLoading}
            >
              {isBillingLoading ? "Checking..." : "Refresh"}
            </Button>
            <Button
              variant="base"
              className={billingControlClassName}
              onClick={handleCustomerPortal}
              disabled={!session || isBillingBusy || !hasSyncAccess}
            >
              Manage
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>
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
    <div className="space-y-7 pb-6">
      <SettingsSection title="Vaulty">
        <div className="px-4 py-3">
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
            A local-first scrapbook for screenshots, notes, links, and
            reminders.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}

function GuideSection() {
  return (
    <div className="space-y-7 pb-6">
      <SettingsSection title="Search Operators">
        <div className="px-4 py-4">
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
                Find images smaller than a specific size. Supports{" "}
                <code>kb</code>, <code>mb</code>, and <code>gb</code>.
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
      </SettingsSection>

      <SettingsSection title="Markdown Formatting">
        <div className="px-4 py-4">
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
              <strong>Checklists:</strong>{" "}
              <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                - [x] Done
              </code>{" "}
              or{" "}
              <code className="font-mono text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                - [ ] Todo
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
      </SettingsSection>
    </div>
  );
}

function ExperimentsSection() {
  const { settings, update } = useSettings();
  const experiments = settings.experiments ?? {};
  return (
    <div className="space-y-7 pb-6">
      <SettingsSection title="Experiments">
        <SettingsRow
          label="Entire settings row clickable"
          description="Allow clicking anywhere on a settings row to toggle, instead of just the switch or control"
          toggleOnRowClick
        >
          <Toggle
            checked={Boolean(experiments["entire-row-clickable"])}
            onChange={(v) =>
              update({
                experiments: { ...experiments, "entire-row-clickable": v },
              })
            }
          />
        </SettingsRow>
        <SettingsRow
          label="Preserve section scroll"
          description="Keep each sidebar section at its own scroll position instead of resetting to the input bar edge"
          toggleOnRowClick
        >
          <Toggle
            checked={Boolean(experiments["preserve-section-scroll"])}
            onChange={(v) =>
              update({
                experiments: { ...experiments, "preserve-section-scroll": v },
              })
            }
          />
        </SettingsRow>
        <SettingsRow
          label="Progressive blur in scroll feed"
          description="Add a soft progressive blur at the bottom edge of the main scroll area"
          toggleOnRowClick
        >
          <Toggle
            checked={Boolean(experiments["progressive-scroll-feed-blur"])}
            onChange={(v) =>
              update({
                experiments: {
                  ...experiments,
                  "progressive-scroll-feed-blur": v,
                },
              })
            }
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

const sectionContent: Record<SectionId, React.FC> = {
  appearance: AppearanceSection,
  behavior: BehaviorSection,
  sync: SyncSection,
  storage: StorageSection,
  guide: GuideSection,
  experiments: ExperimentsSection,
  about: AboutSection,
};

// -- Settings Screen --

export function SettingsScreen({ isOpen, onClose }: SettingsScreenProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("appearance");
  const searchQuery = "";
  const screenRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const reduceMotion = settings.reduceMotion ?? false;
  const isCompact = settings.compactMode ?? false;
  const platform = getElectronAPI()?.getPlatform?.() ?? "";
  const isMac = platform === "darwin";
  // const isWindows = platform === "win32";

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
  const sectionMap = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [],
  );
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sectionGroups
      .map((group) => ({
        ...group,
        sections: group.sectionIds
          .map((sectionId) => sectionMap.get(sectionId))
          .filter((section): section is SectionDef => {
            if (!section) return false;
            if (!query) return true;
            return (
              section.label.toLowerCase().includes(query) ||
              section.id.toLowerCase().includes(query)
            );
          }),
      }))
      .filter((group) => group.sections.length > 0);
  }, [searchQuery, sectionMap]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="settings-screen"
          key="settings-backdrop"
          ref={screenRef}
          className={clsx(
            "fixed inset-0 z-50 flex overflow-hidden",
            "bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50",
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <aside
            className={clsx(
              "flex w-[14rem] shrink-0 flex-col border-r z-10",
              "border-neutral-200 bg-neutral-50/95 dark:border-white/10 dark:bg-neutral-950",
            )}
          >
            <div
              style={{
                paddingTop: isMac ? 33 : 36,
                paddingBottom: 16,
                paddingInline: 8,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className={clsx(
                  "mb-2.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs font-medium",
                  "text-neutral-500 transition-colors hover:bg-black/5 hover:text-neutral-900",
                  "dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <SFIcon icon={sfArrowLeft} size={10} />
                Back to app
              </button>

              {/* <label
                className={clsx(
                  "flex h-10 items-center gap-2 rounded-xl border px-3",
                  "border-neutral-200 bg-white text-neutral-500 shadow-sm",
                  "dark:border-white/10 dark:bg-white/5 dark:text-neutral-400",
                )}
              >
                <SFIcon icon={sfMagnifyingglass} size={15} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white dark:placeholder:text-neutral-500"
                />
              </label> */}
            </div>

            <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 pb-6">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-2 compact:text-xs text-sm font-medium text-neutral-400 dark:text-neutral-500">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.sections.map((section) => {
                      const isActive = section.id === activeSection;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setActiveSection(section.id)}
                          className={clsx(
                            "flex w-full select-none items-center gap-2.5 rounded-xl compact:rounded-lg px-2.5 py-1.5 compact:px-2 compact:py-1 text-left text-sm compact:text-xs font-medium transition-colors",
                            isActive
                              ? "bg-neutral-200 text-neutral-950 dark:bg-white/10 dark:text-white"
                              : "text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white",
                          )}
                        >
                          <SFIcon
                            icon={section.icon}
                            size={isCompact ? 14 : 16}
                            className={clsx(
                              "shrink-0",
                              isActive
                                ? "text-neutral-900 dark:text-white"
                                : "text-neutral-500 dark:text-neutral-400",
                            )}
                          />
                          {section.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredGroups.length === 0 && (
                <p className="px-2 text-sm text-neutral-500 dark:text-neutral-400">
                  No settings found.
                </p>
              )}
            </nav>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white dark:bg-neutral-900">
            <div className="mx-auto w-full max-w-3xl px-10 pb-20 pt-20">
              <h1
                id="settings-title"
                className="text-3xl font-semibold tracking-normal text-neutral-950 dark:text-white"
              >
                {activeLabel}
              </h1>
              <div
                className={clsx(
                  "mt-12 max-w-3xl",
                  "[&_select]:min-w-32",
                  "[&_textarea]:min-h-36",
                  "[_.settings-content-placeholder]:hidden",
                )}
              >
                <ActiveContent />
              </div>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
