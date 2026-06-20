import fs from "fs";
import path from "path";
import { BrowserWindow } from "electron";
import { getCustomCssFilePath, getSettingsPath } from "./paths";
import { AppIconTheme } from "./icon";

export type BackgroundMaterial = "mica" | "acrylic";
export type VaultBackupFrequency = "off" | "hourly" | "daily" | "weekly";
export type VaultBackupRetention = number | "infinite";

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
  vaultBackupFrequency?: VaultBackupFrequency;
  vaultBackupRetention?: VaultBackupRetention;
  lastVaultBackupAt?: string;
  openOnStartup?: boolean;
  startMinimized?: boolean;
  closeToTray?: boolean;
  customCSS?: boolean;
  customCSSContent?: string;
  customCSSUpdatedAt?: string;
  customFont?: boolean;
  customFontFamily?: string;
  experiments?: Record<string, unknown>;
}

function readSettingsFile(): AppSettings {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), "utf-8"));
  } catch {
    return {};
  }
}

function readCustomCssContent(): string {
  try {
    const customCssPath = getCustomCssFilePath();
    if (!fs.existsSync(customCssPath)) {
      return "";
    }
    return fs.readFileSync(customCssPath, "utf-8");
  } catch {
    return "";
  }
}

function writeCustomCssContent(content: string): void {
  const customCssPath = getCustomCssFilePath();
  fs.mkdirSync(path.dirname(customCssPath), { recursive: true });
  fs.writeFileSync(customCssPath, content);
}

function withoutCustomCssContent(settings: AppSettings): AppSettings {
  const copy = { ...settings };
  delete copy.customCSSContent;
  return copy;
}

export function loadSettings(): AppSettings {
  const settings = readSettingsFile();
  const legacyCustomCss =
    typeof settings.customCSSContent === "string" ? settings.customCSSContent : "";
  const customCssContent = readCustomCssContent() || legacyCustomCss;

  if (legacyCustomCss && !readCustomCssContent()) {
    try {
      writeCustomCssContent(legacyCustomCss);
    } catch {
      // Leave migration best-effort; the legacy value is still returned below.
    }
  }

  return {
    ...withoutCustomCssContent(settings),
    customCSSContent: customCssContent,
  };
}

export function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(
    getSettingsPath(),
    JSON.stringify(withoutCustomCssContent(settings), null, 2),
  );

  if (typeof settings.customCSSContent === "string") {
    writeCustomCssContent(settings.customCSSContent);
  }
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
    } else if (process.platform === "darwin") {
      (win as any).setVibrancy("under-window");
      console.log("Applied vibrancy on macOS");
    }
  } else {
    win.setBackgroundColor("#1a1a1a");
    if (process.platform === "win32") {
      (win as any).setBackgroundMaterial("none");
      console.log("Removed transparent background on Windows");
    } else if (process.platform === "darwin") {
      (win as any).setVibrancy(null);
      console.log("Removed vibrancy on macOS");
    }
  }
}
