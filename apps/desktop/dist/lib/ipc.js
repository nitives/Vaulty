"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("./storage");
const settings_1 = require("./settings");
const paths_1 = require("./paths");
const icon_1 = require("./icon");
function registerIpcHandlers(getMainWindow) {
    // App info
    electron_1.ipcMain.handle("app:version", () => electron_1.app.getVersion());
    electron_1.ipcMain.handle("app:name", () => electron_1.app.getName());
    // Window controls
    electron_1.ipcMain.handle("window:minimize", () => {
        getMainWindow()?.minimize();
    });
    electron_1.ipcMain.handle("window:maximize", () => {
        const win = getMainWindow();
        if (win?.isMaximized()) {
            win.unmaximize();
        }
        else {
            win?.maximize();
        }
    });
    electron_1.ipcMain.handle("window:close", () => {
        getMainWindow()?.close();
    });
    electron_1.ipcMain.handle("window:isMaximized", () => {
        return getMainWindow()?.isMaximized() ?? false;
    });
    // Settings
    electron_1.ipcMain.handle("settings:get", () => {
        return (0, settings_1.loadSettings)();
    });
    electron_1.ipcMain.handle("settings:set", (_event, patch) => {
        const settings = (0, settings_1.loadSettings)();
        const updated = { ...settings, ...patch };
        (0, settings_1.saveSettings)(updated);
        const win = getMainWindow();
        if (win && ("transparency" in patch || "backgroundMaterial" in patch)) {
            (0, settings_1.applyTransparency)(win, updated.transparency ?? false, updated.backgroundMaterial);
        }
        if (win && "iconTheme" in patch) {
            const icon = (0, icon_1.getWindowIcon)(updated.iconTheme);
            if (icon) {
                win.setIcon(icon);
            }
        }
        return updated;
    });
    // Theme
    electron_1.ipcMain.handle("theme:set", (_event, theme) => {
        electron_1.nativeTheme.themeSource = theme;
    });
    // Windows accent color
    electron_1.ipcMain.handle("accent:getWindowsColor", () => {
        if (process.platform === "win32") {
            try {
                // Get the Windows accent color (returns RRGGBBAA format)
                const accentColor = electron_1.systemPreferences.getAccentColor();
                // getAccentColor returns RRGGBBAA, covert to RRGGBB
                return `#${accentColor.slice(0, 6)}`;
            }
            catch {
                return null;
            }
        }
        return null;
    });
    if (process.platform === "win32") {
        electron_1.systemPreferences.on("accent-color-changed", (_event, newColor) => {
            const win = getMainWindow();
            if (win && !win.isDestroyed()) {
                win.webContents.send("accent:changed", `#${newColor.slice(0, 6)}`);
            }
        });
    }
    // Items storage
    electron_1.ipcMain.handle("items:load", () => {
        return (0, storage_1.loadItems)();
    });
    electron_1.ipcMain.handle("items:save", (_event, items) => {
        (0, storage_1.saveItems)(items);
        return { success: true };
    });
    electron_1.ipcMain.handle("items:add", (_event, item) => {
        const items = (0, storage_1.loadItems)();
        items.unshift(item);
        (0, storage_1.saveItems)(items);
        return { success: true, items };
    });
    electron_1.ipcMain.handle("items:delete", (_event, id) => {
        const items = (0, storage_1.loadItems)();
        const item = items.find((i) => i.id === id);
        if (item) {
            (0, storage_1.moveToTrash)(item);
        }
        const filtered = items.filter((i) => i.id !== id);
        (0, storage_1.saveItems)(filtered);
        return { success: true, items: filtered };
    });
    electron_1.ipcMain.handle("items:update", (_event, updatedItem) => {
        const items = (0, storage_1.loadItems)();
        const index = items.findIndex((item) => item.id === updatedItem.id);
        if (index !== -1) {
            items[index] = updatedItem;
            (0, storage_1.saveItems)(items);
        }
        return { success: true, items };
    });
    // Folders & Pages
    electron_1.ipcMain.handle("folders:load", () => {
        return (0, storage_1.loadFolders)();
    });
    electron_1.ipcMain.handle("folders:save", (_event, folders) => {
        (0, storage_1.saveFolders)(folders);
        return { success: true };
    });
    electron_1.ipcMain.handle("pages:load", () => {
        return (0, storage_1.loadPages)();
    });
    electron_1.ipcMain.handle("pages:save", (_event, pages) => {
        (0, storage_1.savePages)(pages);
        return { success: true };
    });
    // Trash operations
    electron_1.ipcMain.handle("trash:load", () => {
        return (0, storage_1.loadTrash)();
    });
    electron_1.ipcMain.handle("trash:restore", (_event, id) => {
        const restored = (0, storage_1.restoreFromTrash)(id);
        return { success: !!restored, item: restored };
    });
    electron_1.ipcMain.handle("trash:delete", (_event, id) => {
        (0, storage_1.permanentlyDeleteFromTrash)(id);
        return { success: true };
    });
    electron_1.ipcMain.handle("trash:empty", () => {
        (0, storage_1.emptyTrash)();
        return { success: true };
    });
    electron_1.ipcMain.handle("trash:cleanup", () => {
        const count = (0, storage_1.cleanupOldTrash)();
        return { success: true, deletedCount: count };
    });
    // Image storage
    electron_1.ipcMain.handle("images:save", async (_event, imageData, filename) => {
        return (0, storage_1.saveImage)(imageData, filename);
    });
    electron_1.ipcMain.handle("images:getPath", () => {
        return (0, paths_1.getImagesPath)();
    });
    electron_1.ipcMain.handle("storage:getPath", () => {
        return (0, paths_1.getVaultyDataPath)();
    });
    electron_1.ipcMain.handle("storage:clearAll", () => {
        (0, storage_1.clearAllData)();
        return { success: true };
    });
    electron_1.ipcMain.handle("storage:openTrash", async () => {
        const errorString = await electron_1.shell.openPath((0, paths_1.getTrashPath)());
        return { success: !errorString, error: errorString };
    });
    electron_1.ipcMain.handle("storage:changePath", async () => {
        const win = getMainWindow();
        if (!win)
            return { success: false, error: "No window" };
        const result = await electron_1.dialog.showOpenDialog(win, {
            title: "Select Vaulty Data Location",
            properties: ["openDirectory", "createDirectory"],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }
        const newPath = result.filePaths[0];
        const oldPath = (0, paths_1.getVaultyDataPath)();
        if (newPath === oldPath) {
            return { success: true, path: oldPath };
        }
        try {
            // 1. Move the data over
            // For items.json, folders.json, pages.json
            const oldItemsPath = path_1.default.join(oldPath, "items.json");
            const newItemsPath = path_1.default.join(newPath, "items.json");
            if (fs_1.default.existsSync(oldItemsPath)) {
                fs_1.default.cpSync(oldItemsPath, newItemsPath);
            }
            const oldFoldersPath = path_1.default.join(oldPath, "folders.json");
            const newFoldersPath = path_1.default.join(newPath, "folders.json");
            if (fs_1.default.existsSync(oldFoldersPath)) {
                fs_1.default.cpSync(oldFoldersPath, newFoldersPath);
            }
            const oldPagesPath = path_1.default.join(oldPath, "pages.json");
            const newPagesPath = path_1.default.join(newPath, "pages.json");
            if (fs_1.default.existsSync(oldPagesPath)) {
                fs_1.default.cpSync(oldPagesPath, newPagesPath);
            }
            // For images folder
            const oldImagesPath = path_1.default.join(oldPath, "images");
            const newImagesPath = path_1.default.join(newPath, "images");
            if (fs_1.default.existsSync(oldImagesPath)) {
                fs_1.default.cpSync(oldImagesPath, newImagesPath, { recursive: true });
            }
            // For trash folder
            const oldTrashPath = path_1.default.join(oldPath, "trash");
            const newTrashPath = path_1.default.join(newPath, "trash");
            if (fs_1.default.existsSync(oldTrashPath)) {
                fs_1.default.cpSync(oldTrashPath, newTrashPath, { recursive: true });
            }
            // 2. Save settings to use new path
            const settings = (0, settings_1.loadSettings)();
            settings.vaultyDataPath = newPath;
            (0, settings_1.saveSettings)(settings);
            // 3. Delete old data to save space (safely)
            if (fs_1.default.existsSync(oldItemsPath))
                fs_1.default.unlinkSync(oldItemsPath);
            if (fs_1.default.existsSync(oldFoldersPath))
                fs_1.default.unlinkSync(oldFoldersPath);
            if (fs_1.default.existsSync(oldPagesPath))
                fs_1.default.unlinkSync(oldPagesPath);
            if (fs_1.default.existsSync(oldImagesPath))
                fs_1.default.rmSync(oldImagesPath, { recursive: true, force: true });
            if (fs_1.default.existsSync(oldTrashPath))
                fs_1.default.rmSync(oldTrashPath, { recursive: true, force: true });
            return { success: true, path: newPath };
        }
        catch (e) {
            console.error("Failed to migrate Vaulty data location:", e);
            return { success: false, error: String(e) };
        }
    });
}
