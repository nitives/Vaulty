"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

export type AppIconTheme = "default" | "dev" | "dawn";

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
  backgroundTintOpacityLight?: number;
  backgroundTintOpacityDark?: number;
  reduceMotion?: boolean;
  hideNotesWhenFilteringBySize?: boolean;
  showImageSize?: boolean;
  useFlorence?: boolean;
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
  backgroundTintOpacityLight: 1,
  backgroundTintOpacityDark: 1.5,
  reduceMotion: false,
  hideNotesWhenFilteringBySize: false,
  showImageSize: false,
  useFlorence: false,
};

// -- localStorage helpers (for fast sync access on page load) --

const STORAGE_KEY = "vaulty-settings";

function normalizeIconTheme(theme: unknown): AppIconTheme {
  if (theme === "default" || theme === "dev" || theme === "dawn") {
    return theme;
  }
  // Backward compatibility for previously saved values.
  if (theme === "rounded") return "default";
  if (theme === "dev-dawn") return "dawn";
  if (theme === "dev-night") return "default";
  return DEFAULT_SETTINGS.iconTheme ?? "default";
}

// Read settings injected by blocking script (prevents flash)
function getPreloadedSettings(): AppSettings | null {
  if (typeof window === "undefined") return null;
  const preloaded = (window as Window & { __VAULTY_SETTINGS__?: AppSettings })
    .__VAULTY_SETTINGS__;
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

function saveToLocalStorage(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

// -- Electron bridge helpers --

function getElectronAPI() {
  if (typeof window !== "undefined") {
    return (window as Window & { electronAPI?: Record<string, unknown> })
      .electronAPI as
      | {
          getSettings: () => Promise<AppSettings>;
          setSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
          setNativeTheme: (theme: "system" | "light" | "dark") => Promise<void>;
        }
      | undefined;
  }
  return undefined;
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

  // Load persisted settings from Electron on mount (source of truth)
  useEffect(() => {
    const api = getElectronAPI();
    if (api?.getSettings) {
      api
        .getSettings()
        .then((saved) => {
          const merged = {
            ...DEFAULT_SETTINGS,
            ...saved,
            iconTheme: normalizeIconTheme(saved.iconTheme),
          };
          setSettings(merged);
          saveToLocalStorage(merged); // Keep localStorage in sync
          applyTheme(merged.theme ?? "system");
        })
        .finally(() => setLoading(false));
    } else {
      // Not in Electron -- settings already initialized from cached settings
      // Just apply the theme and mark as loaded
      const cached = getCachedSettings();
      const theme = cached?.theme ?? DEFAULT_SETTINGS.theme ?? "system";
      applyTheme(theme);
      queueMicrotask(() => setLoading(false));
    }
  }, []);

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

  const update = useCallback((patch: Partial<AppSettings>) => {
    const normalizedPatch =
      "iconTheme" in patch
        ? { ...patch, iconTheme: normalizeIconTheme(patch.iconTheme) }
        : patch;

    setSettings((prev) => {
      const next = { ...prev, ...normalizedPatch };
      // Persist to localStorage for fast reload
      saveToLocalStorage(next);
      // Persist to Electron asynchronously
      const api = getElectronAPI();
      if (api?.setSettings) {
        api.setSettings(normalizedPatch);
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
