"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { pushCollectionRecords } from "@/lib/sync";
import { getElectronAPI as getElectronAPIBase } from "@/lib/electron";

// -- Settings schema --
// Add new settings fields here. Every field must be optional so the
// persisted JSON stays forward-compatible.

export type AccentColor =
  | "multicolor"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "graphite";

export type AppIconTheme =
  | "default"
  | "dev"
  | "dawn"
  | "sunset"
  | "midnight"
  | "inverted";

export type VaultBackupFrequency = "off" | "hourly" | "daily" | "weekly";
export type VaultBackupRetention = number | "infinite";

export interface AppSettings {
  transparency?: boolean;
  titlebarTransparent?: boolean;
  backgroundMaterial?: "mica" | "acrylic";
  theme?: "system" | "light" | "dark";
  iconTheme?: AppIconTheme;
  accentColor?: AccentColor;
  compactMode?: boolean;
  startCollapsed?: boolean;
  confirmBeforeDelete?: boolean;
  inputBarPosition?: "top" | "bottom";
  showSidebarIcons?: boolean;
  usePointerCursors?: boolean;
  backgroundTintOpacityLight?: number;
  backgroundTintOpacityDark?: number;
  reduceMotion?: boolean;
  hideNotesWhenFilteringBySize?: boolean;
  showImageSize?: boolean;
  showImageFileName?: boolean;
  persistInputBarStateOnSwitch?: boolean;
  useFlorence?: boolean;
  sidebarTransparent?: boolean;
  vaultBackupFrequency?: VaultBackupFrequency;
  vaultBackupRetention?: VaultBackupRetention;
  lastVaultBackupAt?: string;
  openOnStartup?: boolean;
  startMinimized?: boolean;
  closeToTray?: boolean;
  customFont?: boolean;
  customFontFamily?: string;
  customCSS?: boolean;
  customCSSContent?: string;
  customCSSUpdatedAt?: string;
  experiments?: Record<string, unknown>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  transparency: false,
  titlebarTransparent: false,
  backgroundMaterial: "mica",
  theme: "system",
  iconTheme: "default",
  accentColor: "blue",
  compactMode: false,
  startCollapsed: false,
  confirmBeforeDelete: true,
  inputBarPosition: "bottom",
  showSidebarIcons: true,
  usePointerCursors: true,
  backgroundTintOpacityLight: 1,
  backgroundTintOpacityDark: 1.5,
  reduceMotion: false,
  hideNotesWhenFilteringBySize: false,
  showImageSize: false,
  showImageFileName: false,
  persistInputBarStateOnSwitch: true,
  useFlorence: false,
  sidebarTransparent: false,
  vaultBackupFrequency: "off",
  vaultBackupRetention: 5,
  openOnStartup: false,
  startMinimized: false,
  closeToTray: true,
  customFont: false,
  customFontFamily: "",
  customCSS: false,
  customCSSContent: "",
};

// -- localStorage helpers (for fast sync access on page load) --

const STORAGE_KEY = "vaulty-settings";
const VAULTY_SYNC_COMPLETE_EVENT = "vaulty:sync-complete";
const CUSTOM_CSS_SYNC_RECORD_ID = "custom-css";

function normalizeIconTheme(theme: unknown): AppIconTheme {
  if (
    theme === "default" ||
    theme === "dev" ||
    theme === "dawn" ||
    theme === "sunset" ||
    theme === "midnight" ||
    theme === "inverted"
  ) {
    return theme;
  }
  // Backward compatibility for previously saved values.
  if (theme === "rounded") return "default";
  if (theme === "dev-dawn") return "dawn";
  if (theme === "dev-night") return "default";
  if (theme === "dev-sunset") return "sunset";
  if (theme === "dev-midnight") return "midnight";
  if (theme === "dev-inverted") return "inverted";
  return DEFAULT_SETTINGS.iconTheme ?? "default";
}

// Read settings injected by blocking script (prevents flash)
function getPreloadedSettings(): AppSettings | null {
  if (typeof window === "undefined") return null;
  const preloaded = window.__VAULTY_SETTINGS__;
  return preloaded ?? null;
}

function loadFromLocalStorage(): AppSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AppSettings;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function getCachedSettings(): AppSettings | null {
  // First try preloaded (set by blocking script), then localStorage
  return getPreloadedSettings() || loadFromLocalStorage();
}

function settingsForLocalStorage(settings: AppSettings): AppSettings {
  const copy = { ...settings };
  delete copy.customCSSContent;
  return copy;
}

function saveToLocalStorage(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settingsForLocalStorage(settings)),
    );
  } catch {
    // Ignore storage errors
  }
}

function queueCustomCssSync(settings: AppSettings): void {
  const updatedAt = settings.customCSSUpdatedAt ?? new Date().toISOString();
  const record = {
    id: CUSTOM_CSS_SYNC_RECORD_ID,
    customCSS: Boolean(settings.customCSS),
    customCSSContent: settings.customCSSContent ?? "",
    cssPath: "custom.css",
    updatedAt,
  };
  pushCollectionRecords("settings", [record]).catch((err) =>
    console.error("Vaulty custom CSS sync failed:", err),
  );
}

function getElectronAPI() {
  const api = getElectronAPIBase();
  if (!api) return undefined;
  return api as unknown as {
    getSettings: () => Promise<AppSettings>;
    setSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
    setNativeTheme: (theme: "system" | "light" | "dark") => Promise<void>;
  };
}

// -- Theme helpers --

function getSystemDarkPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply or remove the `dark` class on <html> and tell Electron about the change. */
function applyTheme(theme: "system" | "light" | "dark"): void {
  if (typeof document === "undefined") return;

  const isDark =
    theme === "dark" || (theme === "system" && getSystemDarkPreference());

  document.documentElement.classList.toggle("dark", isDark);

  // Sync with Electron's nativeTheme so acrylic/mica tints match
  const api = getElectronAPI();
  api?.setNativeTheme(theme);
}

// -- Context --

interface SettingsContextValue {
  settings: AppSettings;
  /** Merge a partial update into settings. Persists via Electron when available. */
  update: (patch: Partial<AppSettings>) => void;
  /** True while the initial load from disk is in progress. */
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  loading: true,
});

// -- Provider --

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Initialize from cached settings for instant load (no flash)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const cached = getCachedSettings();
    return cached
      ? {
          ...DEFAULT_SETTINGS,
          ...cached,
          iconTheme: normalizeIconTheme(cached.iconTheme),
        }
      : DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(true);

  const mergeSavedSettings = useCallback((saved: AppSettings): AppSettings => {
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      iconTheme: normalizeIconTheme(saved.iconTheme),
    };
  }, []);

  const reloadPersistedSettings = useCallback(async () => {
    const api = getElectronAPI();
    if (!api?.getSettings) {
      const cached = loadFromLocalStorage();
      if (!cached) return null;

      const merged = mergeSavedSettings(cached);
      setSettings(merged);
      applyTheme(merged.theme ?? "system");
      return merged;
    }

    const merged = mergeSavedSettings(await api.getSettings());
    setSettings(merged);
    saveToLocalStorage(merged);
    applyTheme(merged.theme ?? "system");
    return merged;
  }, [mergeSavedSettings]);

  // Load persisted settings from Electron on mount (source of truth)
  useEffect(() => {
    if (getElectronAPI()?.getSettings) {
      const timer = window.setTimeout(() => {
        void reloadPersistedSettings().finally(() => setLoading(false));
      }, 0);
      return () => window.clearTimeout(timer);
    } else {
      // Not in Electron -- settings already initialized from cached settings
      // Just apply the theme and mark as loaded
      const cached = getCachedSettings();
      const theme = cached?.theme ?? DEFAULT_SETTINGS.theme ?? "system";
      applyTheme(theme);
      queueMicrotask(() => setLoading(false));
    }
  }, [reloadPersistedSettings]);

  useEffect(() => {
    const handleSyncComplete = () => {
      void reloadPersistedSettings();
    };

    window.addEventListener(VAULTY_SYNC_COMPLETE_EVENT, handleSyncComplete);
    return () => {
      window.removeEventListener(VAULTY_SYNC_COMPLETE_EVENT, handleSyncComplete);
    };
  }, [reloadPersistedSettings]);

  // Sync dark class + native theme whenever settings.theme changes
  useEffect(() => {
    const theme = settings.theme ?? "system";
    applyTheme(theme);

    // When theme is "system", listen for OS preference changes
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.theme]);

  // Sync tint opacity CSS variables when settings change
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const lightAlpha = settings.backgroundTintOpacityLight ?? 0.1;
    const darkAlpha = settings.backgroundTintOpacityDark ?? 0.15;
    root.style.setProperty(
      "--main-content-background-tint-light",
      `rgba(255,255,255,${lightAlpha})`,
    );
    root.style.setProperty(
      "--main-content-background-tint-dark",
      `rgba(23,23,23,${darkAlpha})`,
    );
  }, [settings.backgroundTintOpacityLight, settings.backgroundTintOpacityDark]);

  // Reduce motion
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle(
      "reduce-motion",
      !!settings.reduceMotion,
    );
  }, [settings.reduceMotion]);

  // Custom font
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (settings.customFont && settings.customFontFamily?.trim()) {
      body.style.setProperty(
        "--app-font-family",
        `"${settings.customFontFamily.trim()}", system-ui, sans-serif`,
      );
    } else {
      body.style.removeProperty("--app-font-family");
    }
  }, [settings.customFont, settings.customFontFamily]);

  // Custom CSS
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "vaulty-custom-css";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (settings.customCSS && settings.customCSSContent?.trim()) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = settings.customCSSContent;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [settings.customCSS, settings.customCSSContent]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const updatesCustomCss =
      "customCSS" in patch || "customCSSContent" in patch;
    const normalizedPatch = {
      ...patch,
      ...("iconTheme" in patch
        ? { iconTheme: normalizeIconTheme(patch.iconTheme) }
        : {}),
      ...(updatesCustomCss && !("customCSSUpdatedAt" in patch)
        ? { customCSSUpdatedAt: new Date().toISOString() }
        : {}),
    };

    setSettings((prev) => {
      const next = { ...prev, ...normalizedPatch };
      // Persist to localStorage for fast reload
      saveToLocalStorage(next);
      // Persist full settings to Electron so the file always has every field
      const api = getElectronAPI();
      if (api?.setSettings) {
        api.setSettings(next);
      }
      if (updatesCustomCss) {
        queueCustomCssSync(next);
      }
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, loading }),
    [settings, update, loading],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// -- Hook --

export function useSettings() {
  return useContext(SettingsContext);
}
