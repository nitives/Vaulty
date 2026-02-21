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
    document.documentElement.setAttribute(
      "data-accent",
      settings.accentColor ?? "blue",
    );

    // If multicolor is selected, fetch and apply Windows accent color
    if (
      settings.accentColor === "multicolor" &&
      window.electronAPI?.getWindowsAccentColor
    ) {
      const applyWindowsColor = (color: string | null) => {
        if (color) {
          // Set the base color - CSS uses oklch to derive all shades
          document.documentElement.style.setProperty(
            "--windows-accent-base",
            color,
          );
        }
      };

      // 1. Fetch current color immediately on mount
      window.electronAPI.getWindowsAccentColor().then(applyWindowsColor);

      // 2. Listen for live system changes if supported
      if (window.electronAPI.onAccentColorChanged) {
        const unsubscribe =
          window.electronAPI.onAccentColorChanged(applyWindowsColor);
        return () => unsubscribe();
      }
    }
  }, [settings.accentColor]);
}
