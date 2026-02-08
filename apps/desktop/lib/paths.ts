import { app } from "electron";
import path from "path";

// Data storage paths
export function getVaultyDataPath(): string {
  return path.join(app.getPath("documents"), "vaulty");
}

export function getItemsFilePath(): string {
  return path.join(getVaultyDataPath(), "items.json");
}

export function getImagesPath(): string {
  return path.join(getVaultyDataPath(), "images");
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

export function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export function getWebAppPath(isDev: boolean): string {
  if (isDev) return path.join(__dirname, "..", "..", "..", "web");
  return path.join(process.resourcesPath, "web");
}
