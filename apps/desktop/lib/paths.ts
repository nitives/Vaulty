import { app } from "electron";
import path from "path";
import fs from "fs";

// Data storage paths
export function getVaultyDataPath(): string {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      const settings = JSON.parse(data);
      if (settings.vaultyDataPath) {
        return settings.vaultyDataPath;
      }
    }
  } catch (e) {
    // Fall back to default if parsing fails
  }

  return path.join(app.getPath("documents"), "vaulty");
}

export function getItemsFilePath(): string {
  return path.join(getVaultyDataPath(), "items.json");
}

export function getFoldersFilePath(): string {
  return path.join(getVaultyDataPath(), "folders.json");
}

export function getPagesFilePath(): string {
  return path.join(getVaultyDataPath(), "pages.json");
}

export function getImagesPath(): string {
  return path.join(getVaultyDataPath(), "images");
}

export function getAudiosPath(): string {
  return path.join(getVaultyDataPath(), "audios");
}

export function getTrashPath(): string {
  return path.join(getVaultyDataPath(), "trash");
}

export function getTrashFilePath(): string {
  return path.join(getTrashPath(), "trash.json");
}

export function getTrashImagesPath(): string {
  return path.join(getTrashPath(), "images");
}

export function getTrashAudiosPath(): string {
  return path.join(getTrashPath(), "audios");
}

export function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export function getLegacyPulsesConfigPath(): string {
  return path.join(app.getPath("userData"), "pulses");
}

export function getPulsesConfigPath(): string {
  return path.join(getVaultyDataPath(), "pulses");
}

export function getPulsesFilePath(): string {
  return path.join(getVaultyDataPath(), "pulses.json");
}

export function getPulseItemsFilePath(): string {
  return path.join(getVaultyDataPath(), "pulseItems.json");
}

export function getWebAppPath(isDev: boolean): string {
  if (isDev) return path.join(__dirname, "..", "..", "..", "web");
  return path.join(process.resourcesPath, "web");
}
