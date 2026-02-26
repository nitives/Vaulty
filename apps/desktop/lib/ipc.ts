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
  saveMetadataImage,
  saveAudioImage,
  saveAudio,
  StoredItem,
  moveToTrash,
  loadTrash,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  emptyTrash,
  cleanupOldTrash,
  clearAllData,
  loadFolders,
  saveFolders,
  loadPages,
  savePages,
  StoredFolder,
  StoredPage,
  loadPulses,
  savePulses,
  loadPulseItems,
  savePulseItems,
} from "./storage";
import {
  loadSettings,
  saveSettings,
  applyTransparency,
  AppSettings,
} from "./settings";
import {
  getVaultyDataPath,
  getImagesPath,
  getAudiosPath,
  getTrashPath,
} from "./paths";
import { getWindowIcon } from "./icon";
import { fetchOpenGraph } from "./opengraph";

function normalizeAccentColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const hex = color.trim().replace(/^#/, "");
  if (!/^[\da-fA-F]+$/.test(hex)) return null;
  if (hex.length === 6) return `#${hex.toLowerCase()}`;
  // Electron system colors use RGBA; strip alpha for CSS use.
  if (hex.length === 8) return `#${hex.slice(0, 6).toLowerCase()}`;
  return null;
}

function getCurrentWindowsAccentColor(): string | null {
  if (process.platform !== "win32") return null;
  try {
    return normalizeAccentColor(systemPreferences.getAccentColor());
  } catch {
    return null;
  }
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "link";
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
  };
  return map[normalized] ?? null;
}

function extensionFromUrl(rawUrl: string): string | null {
  try {
    const pathname = new URL(rawUrl).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
    if (!ext) return null;
    if (["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"].includes(ext)) {
      return ext === "jpeg" ? "jpg" : ext;
    }
  } catch {
    // Ignore parse failures.
  }
  return null;
}

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

  ipcMain.handle("settings:startup", (_event, openOnStartup: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: openOnStartup,
      path: app.getPath("exe"),
    });
  });

  // Theme
  ipcMain.handle("theme:set", (_event, theme: "system" | "light" | "dark") => {
    nativeTheme.themeSource = theme;
  });

  ipcMain.handle(
    "metadata:fetch",
    async (_event, rawUrl: string, itemId?: string) => {
      if (typeof rawUrl !== "string" || !rawUrl.trim()) {
        return {};
      }

      let targetUrl: string;
      try {
        targetUrl = new URL(rawUrl.trim()).toString();
      } catch {
        return {};
      }

      if (!/^https?:/i.test(targetUrl)) {
        return {};
      }

      const metadata = await fetchOpenGraph(targetUrl);

      if (metadata.image) {
        let imageUrl = metadata.image;
        try {
          imageUrl = new URL(imageUrl, targetUrl).toString();
        } catch {
          imageUrl = metadata.image;
        }

        try {
          const response = await fetch(imageUrl, {
            redirect: "follow",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
          });

          const contentType = response.headers.get("content-type");
          if (
            response.ok &&
            contentType?.toLowerCase().startsWith("image/")
          ) {
            const imageBytes = Buffer.from(await response.arrayBuffer());
            const mimeType = contentType.split(";")[0].trim();
            const base64Data = imageBytes.toString("base64");
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            const safeId = sanitizeFilePart(itemId ?? targetUrl);
            const ext =
              extensionFromContentType(contentType) ??
              extensionFromUrl(imageUrl) ??
              "jpg";
            const filename = `link_${safeId}_og.${ext}`;
            const saved = saveMetadataImage(dataUrl, filename);
            if (saved.success && saved.path) {
              metadata.image = saved.path;
            } else {
              metadata.image = imageUrl;
            }
          } else {
            metadata.image = imageUrl;
          }
        } catch {
          // Keep the previously resolved image URL if image download fails.
          metadata.image = imageUrl;
        }
      }

      return metadata;
    },
  );

  // Windows accent color
  ipcMain.handle("accent:getWindowsColor", () => {
    return getCurrentWindowsAccentColor();
  });

  if (process.platform === "win32") {
    systemPreferences.on("accent-color-changed", () => {
      const win = getMainWindow();
      const currentColor = getCurrentWindowsAccentColor();
      if (win && !win.isDestroyed() && currentColor) {
        win.webContents.send("accent:changed", currentColor);
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

  // Folders & Pages
  ipcMain.handle("folders:load", () => {
    return loadFolders();
  });

  ipcMain.handle("folders:save", (_event, folders: StoredFolder[]) => {
    saveFolders(folders);
    return { success: true };
  });

  ipcMain.handle("pages:load", () => {
    return loadPages();
  });

  ipcMain.handle("pages:save", (_event, pages: StoredPage[]) => {
    savePages(pages);
    return { success: true };
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

  // Audio storage
  ipcMain.handle(
    "audios:save",
    async (_event, audioData: string, filename: string) => {
      return saveAudio(audioData, filename);
    },
  );

  ipcMain.handle(
    "audios:saveImage",
    async (_event, imageData: string, filename: string) => {
      return saveAudioImage(imageData, filename);
    },
  );

  ipcMain.handle("audios:getPath", () => {
    return getAudiosPath();
  });

  ipcMain.handle("storage:getPath", () => {
    return getVaultyDataPath();
  });

  ipcMain.handle("storage:clearAll", () => {
    clearAllData();
    return { success: true };
  });

  // Pulses
  ipcMain.handle("pulses:load", () => {
    return loadPulses();
  });

  ipcMain.handle("pulses:loadItems", () => {
    return loadPulseItems();
  });

  ipcMain.handle("pulses:markItemSeen", (_event, id: string) => {
    const items = loadPulseItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      item.isSeen = true;
      savePulseItems(items);
      return { success: true, item };
    }
    return { success: false, error: "Not found" };
  });

  ipcMain.handle("storage:openTrash", async () => {
    const errorString = await shell.openPath(getTrashPath());
    return { success: !errorString, error: errorString };
  });

  ipcMain.handle("storage:openVault", async () => {
    const errorString = await shell.openPath(getVaultyDataPath());
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
      // For items.json, folders.json, pages.json
      const oldItemsPath = path.join(oldPath, "items.json");
      const newItemsPath = path.join(newPath, "items.json");
      if (fs.existsSync(oldItemsPath)) {
        fs.cpSync(oldItemsPath, newItemsPath);
      }

      const oldFoldersPath = path.join(oldPath, "folders.json");
      const newFoldersPath = path.join(newPath, "folders.json");
      if (fs.existsSync(oldFoldersPath)) {
        fs.cpSync(oldFoldersPath, newFoldersPath);
      }

      const oldPagesPath = path.join(oldPath, "pages.json");
      const newPagesPath = path.join(newPath, "pages.json");
      if (fs.existsSync(oldPagesPath)) {
        fs.cpSync(oldPagesPath, newPagesPath);
      }
      const oldPulsesPath = path.join(oldPath, "pulses.json");
      const newPulsesPath = path.join(newPath, "pulses.json");
      if (fs.existsSync(oldPulsesPath)) {
        fs.cpSync(oldPulsesPath, newPulsesPath);
      }
      const oldPulseItemsPath = path.join(oldPath, "pulseItems.json");
      const newPulseItemsPath = path.join(newPath, "pulseItems.json");
      if (fs.existsSync(oldPulseItemsPath)) {
        fs.cpSync(oldPulseItemsPath, newPulseItemsPath);
      }

      // For images folder
      const oldImagesPath = path.join(oldPath, "images");
      const newImagesPath = path.join(newPath, "images");
      if (fs.existsSync(oldImagesPath)) {
        fs.cpSync(oldImagesPath, newImagesPath, { recursive: true });
      }

      // For metadata folder
      const oldMetadataPath = path.join(oldPath, "metadata");
      const newMetadataPath = path.join(newPath, "metadata");
      if (fs.existsSync(oldMetadataPath)) {
        fs.cpSync(oldMetadataPath, newMetadataPath, { recursive: true });
      }

      // For audios folder
      const oldAudiosPath = path.join(oldPath, "audios");
      const newAudiosPath = path.join(newPath, "audios");
      if (fs.existsSync(oldAudiosPath)) {
        fs.cpSync(oldAudiosPath, newAudiosPath, { recursive: true });
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
      if (fs.existsSync(oldFoldersPath)) fs.unlinkSync(oldFoldersPath);
      if (fs.existsSync(oldPagesPath)) fs.unlinkSync(oldPagesPath);
      if (fs.existsSync(oldPulsesPath)) fs.unlinkSync(oldPulsesPath);
      if (fs.existsSync(oldPulseItemsPath)) fs.unlinkSync(oldPulseItemsPath);
      if (fs.existsSync(oldImagesPath))
        fs.rmSync(oldImagesPath, { recursive: true, force: true });
      if (fs.existsSync(oldMetadataPath))
        fs.rmSync(oldMetadataPath, { recursive: true, force: true });
      if (fs.existsSync(oldAudiosPath))
        fs.rmSync(oldAudiosPath, { recursive: true, force: true });
      if (fs.existsSync(oldTrashPath))
        fs.rmSync(oldTrashPath, { recursive: true, force: true });

      return { success: true, path: newPath };
    } catch (e) {
      console.error("Failed to migrate Vaulty data location:", e);
      return { success: false, error: String(e) };
    }
  });
}
