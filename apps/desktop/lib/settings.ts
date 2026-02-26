import fs from "fs";
import { BrowserWindow } from "electron";
import { getSettingsPath } from "./paths";
import { AppIconTheme } from "./icon";

export type BackgroundMaterial = "mica" | "acrylic";

export interface AppSettings {
  transparency?: boolean;
  titlebarTransparent?: boolean;
  backgroundMaterial?: BackgroundMaterial;
  theme?: "system" | "light" | "dark";
  iconTheme?: AppIconTheme;
  accentColor?: string;
  compactMode?: boolean;
  startCollapsed?: boolean;
  confirmBeforeDelete?: boolean;
  inputBarPosition?: "top" | "bottom";
  backgroundTintOpacityLight?: number;
  backgroundTintOpacityDark?: number;
  reduceMotion?: boolean;
  hideNotesWhenFilteringBySize?: boolean;
  showImageSize?: boolean;
  showImageFileName?: boolean;
  persistInputBarStateOnSwitch?: boolean;
  useFlorence?: boolean;
  sidebarTransparent?: boolean;
  vaultyDataPath?: string;
  openOnStartup?: boolean;
  startMinimized?: boolean;
  closeToTray?: boolean;
}

export function loadSettings(): AppSettings {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), "utf-8"));
  } catch {
    return {};
  }
}

export function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

export function applyTransparency(
  win: BrowserWindow,
  enabled: boolean,
  material?: BackgroundMaterial,
): void {
  const mat = material ?? "mica";
  if (enabled) {
    win.setBackgroundColor("#00000000");
    if (process.platform === "win32") {
      (win as any).setBackgroundMaterial(mat);
      console.log(`Applied ${mat} background on Windows`);
    }
  } else {
    win.setBackgroundColor("#1a1a1a");
    if (process.platform === "win32") {
      (win as any).setBackgroundMaterial("none");
      console.log("Removed transparent background on Windows");
    }
  }
}
