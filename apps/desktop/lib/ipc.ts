import {
  app,
  ipcMain,
  nativeTheme,
  BrowserWindow,
  systemPreferences,
  dialog,
  shell,
} from "electron";
import fs from "fs";
import path from "path";
import {
  loadItems,
  saveItems,
  saveImage,
  StoredItem,
  moveToTrash,
  loadTrash,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  emptyTrash,
  cleanupOldTrash,
  clearAllData,
} from "./storage";
import {
  loadSettings,
  saveSettings,
  applyTransparency,
  AppSettings,
} from "./settings";
import { getVaultyDataPath, getImagesPath, getTrashPath } from "./paths";
import { getWindowIcon } from "./icon";

export function registerIpcHandlers(
  getMainWindow: () => BrowserWindow | null,
): void {
  // App info
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:name", () => app.getName());

  // Window controls
  ipcMain.handle("window:minimize", () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle("window:maximize", () => {
    const win = getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle("window:close", () => {
    getMainWindow()?.close();
  });

  ipcMain.handle("window:isMaximized", () => {
    return getMainWindow()?.isMaximized() ?? false;
  });

  // Settings
  ipcMain.handle("settings:get", () => {
    return loadSettings();
  });

  ipcMain.handle("settings:set", (_event, patch: Partial<AppSettings>) => {
    const settings = loadSettings();
    const updated = { ...settings, ...patch };
    saveSettings(updated);

    const win = getMainWindow();
    if (win && ("transparency" in patch || "backgroundMaterial" in patch)) {
      applyTransparency(
        win,
        updated.transparency ?? false,
        updated.backgroundMaterial,
      );
    }
    if (win && "iconTheme" in patch) {
      const icon = getWindowIcon(updated.iconTheme);
      if (icon) {
        win.setIcon(icon);
      }
    }

    return updated;
  });

  // Theme
  ipcMain.handle("theme:set", (_event, theme: "system" | "light" | "dark") => {
    nativeTheme.themeSource = theme;
  });

  // Windows accent color
  ipcMain.handle("accent:getWindowsColor", () => {
    if (process.platform === "win32") {
      try {
        // Get the Windows accent color (returns RRGGBBAA format)
        const accentColor = systemPreferences.getAccentColor();
        // getAccentColor returns RRGGBBAA, covert to RRGGBB
        return `#${accentColor.slice(0, 6)}`;
      } catch {
        return null;
      }
    }
    return null;
  });

  if (process.platform === "win32") {
    systemPreferences.on("accent-color-changed", (_event, newColor) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send("accent:changed", `#${newColor.slice(0, 6)}`);
      }
    });
  }

  // Items storage
  ipcMain.handle("items:load", () => {
    return loadItems();
  });

  ipcMain.handle("items:save", (_event, items: StoredItem[]) => {
    saveItems(items);
    return { success: true };
  });

  ipcMain.handle("items:add", (_event, item: StoredItem) => {
    const items = loadItems();
    items.unshift(item);
    saveItems(items);
    return { success: true, items };
  });

  ipcMain.handle("items:delete", (_event, id: string) => {
    const items = loadItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      moveToTrash(item);
    }
    const filtered = items.filter((i) => i.id !== id);
    saveItems(filtered);
    return { success: true, items: filtered };
  });

  ipcMain.handle("items:update", (_event, updatedItem: StoredItem) => {
    const items = loadItems();
    const index = items.findIndex((item) => item.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
      saveItems(items);
    }
    return { success: true, items };
  });

  // Trash operations
  ipcMain.handle("trash:load", () => {
    return loadTrash();
  });

  ipcMain.handle("trash:restore", (_event, id: string) => {
    const restored = restoreFromTrash(id);
    return { success: !!restored, item: restored };
  });

  ipcMain.handle("trash:delete", (_event, id: string) => {
    permanentlyDeleteFromTrash(id);
    return { success: true };
  });

  ipcMain.handle("trash:empty", () => {
    emptyTrash();
    return { success: true };
  });

  ipcMain.handle("trash:cleanup", () => {
    const count = cleanupOldTrash();
    return { success: true, deletedCount: count };
  });

  // Image storage
  ipcMain.handle(
    "images:save",
    async (_event, imageData: string, filename: string) => {
      return saveImage(imageData, filename);
    },
  );

  ipcMain.handle("images:getPath", () => {
    return getImagesPath();
  });

  ipcMain.handle("storage:getPath", () => {
    return getVaultyDataPath();
  });

  ipcMain.handle("storage:clearAll", () => {
    clearAllData();
    return { success: true };
  });

  ipcMain.handle("storage:openTrash", async () => {
    const errorString = await shell.openPath(getTrashPath());
    return { success: !errorString, error: errorString };
  });

  ipcMain.handle("storage:changePath", async () => {
    const win = getMainWindow();
    if (!win) return { success: false, error: "No window" };

    const result = await dialog.showOpenDialog(win, {
      title: "Select Vaulty Data Location",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const newPath = result.filePaths[0];
    const oldPath = getVaultyDataPath();

    if (newPath === oldPath) {
      return { success: true, path: oldPath };
    }

    try {
      // 1. Move the data over
      // For items.json
      const oldItemsPath = path.join(oldPath, "items.json");
      const newItemsPath = path.join(newPath, "items.json");
      if (fs.existsSync(oldItemsPath)) {
        fs.cpSync(oldItemsPath, newItemsPath);
      }

      // For images folder
      const oldImagesPath = path.join(oldPath, "images");
      const newImagesPath = path.join(newPath, "images");
      if (fs.existsSync(oldImagesPath)) {
        fs.cpSync(oldImagesPath, newImagesPath, { recursive: true });
      }

      // For trash folder
      const oldTrashPath = path.join(oldPath, "trash");
      const newTrashPath = path.join(newPath, "trash");
      if (fs.existsSync(oldTrashPath)) {
        fs.cpSync(oldTrashPath, newTrashPath, { recursive: true });
      }

      // 2. Save settings to use new path
      const settings = loadSettings();
      settings.vaultyDataPath = newPath;
      saveSettings(settings);

      // 3. Delete old data to save space (safely)
      if (fs.existsSync(oldItemsPath)) fs.unlinkSync(oldItemsPath);
      if (fs.existsSync(oldImagesPath))
        fs.rmSync(oldImagesPath, { recursive: true, force: true });
      if (fs.existsSync(oldTrashPath))
        fs.rmSync(oldTrashPath, { recursive: true, force: true });

      return { success: true, path: newPath };
    } catch (e) {
      console.error("Failed to migrate Vaulty data location:", e);
      return { success: false, error: String(e) };
    }
  });
}
