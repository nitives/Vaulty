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

export interface AppSettings {
  transparency?: boolean;
  backgroundMaterial?: "mica" | "acrylic";
  theme?: "system" | "light" | "dark";
  compactMode?: boolean;
  startCollapsed?: boolean;
  confirmBeforeDelete?: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  transparency: false,
  backgroundMaterial: "mica",
  theme: "system",
  compactMode: false,
  startCollapsed: false,
  confirmBeforeDelete: true,
};

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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load persisted settings once on mount
  useEffect(() => {
    const api = getElectronAPI();
    if (api?.getSettings) {
      api
        .getSettings()
        .then((saved) => {
          const merged = { ...DEFAULT_SETTINGS, ...saved };
          setSettings(merged);
          applyTheme(merged.theme ?? "system");
        })
        .finally(() => setLoading(false));
    } else {
      // Not in Electron -- apply default theme and use defaults
      applyTheme(DEFAULT_SETTINGS.theme ?? "system");
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

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // Persist to Electron asynchronously
      const api = getElectronAPI();
      if (api?.setSettings) {
        api.setSettings(patch);
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
