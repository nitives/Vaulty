import { useEffect } from "react";
import { AppSettings } from "@/lib/settings";

export function useThemeClasses(settings: AppSettings) {
  // Toggle body class for transparent background
  useEffect(() => {
    if (settings.transparency) {
      document.body.classList.add("transparent-mode");
    } else {
      document.body.classList.remove("transparent-mode");
    }
    return () => {
      document.body.classList.remove("transparent-mode");
    };
  }, [settings.transparency]);

  // Toggle body class for compact mode
  useEffect(() => {
    if (settings.compactMode) {
      document.body.classList.add("compact-mode");
    } else {
      document.body.classList.remove("compact-mode");
    }
    return () => {
      document.body.classList.remove("compact-mode");
    };
  }, [settings.compactMode]);

  // Toggle body class for sidebar transparent mode
  useEffect(() => {
    if (settings.sidebarTransparent) {
      document.body.classList.add("sidebar-transparent");
    } else {
      document.body.classList.remove("sidebar-transparent");
    }
    return () => {
      document.body.classList.remove("sidebar-transparent");
    };
  }, [settings.sidebarTransparent]);

  // Sync input bar position class with settings
  useEffect(() => {
    if (settings.inputBarPosition === "top") {
      document.documentElement.classList.add("input-bar-top");
    } else {
      document.documentElement.classList.remove("input-bar-top");
    }
  }, [settings.inputBarPosition]);

  // Sync accent color attribute with settings
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-accent", settings.accentColor ?? "blue");

    // Multicolor maps to Windows accent color in real time.
    if (
      settings.accentColor !== "multicolor" ||
      !window.electronAPI?.getWindowsAccentColor
    ) {
      root.style.removeProperty("--windows-accent-base");
      return;
    }

    let disposed = false;

    const normalizeWindowsAccent = (color: string | null): string | null => {
      if (!color) return null;
      const hex = color.trim().replace(/^#/, "");
      if (!/^[\da-fA-F]+$/.test(hex)) return null;
      if (hex.length === 6) return `#${hex.toLowerCase()}`;
      // Electron returns RGBA for system accent values; drop alpha for CSS base.
      if (hex.length === 8) return `#${hex.slice(0, 6).toLowerCase()}`;
      return null;
    };

    const applyWindowsColor = (rawColor: string | null) => {
      const color = normalizeWindowsAccent(rawColor);
      if (!color || disposed) return;
      root.style.setProperty("--windows-accent-base", color);
    };

    const refreshWindowsColor = async () => {
      try {
        const color = await window.electronAPI.getWindowsAccentColor();
        applyWindowsColor(color);
      } catch {
        // Ignore bridge failures; CSS fallback color remains in use.
      }
    };

    // Initial sync when entering multicolor mode.
    void refreshWindowsColor();

    // Re-sync when app regains focus or returns to visible state.
    const onFocus = () => void refreshWindowsColor();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshWindowsColor();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Defensive refresh in case system event is missed.
    const pollId = window.setInterval(() => {
      void refreshWindowsColor();
    }, 60_000);

    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI.onAccentColorChanged) {
      unsubscribe = window.electronAPI.onAccentColorChanged(applyWindowsColor);
    }

    return () => {
      disposed = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(pollId);
      unsubscribe?.();
    };
  }, [settings.accentColor]);
}
