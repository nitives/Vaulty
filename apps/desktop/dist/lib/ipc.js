"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const storage_1 = require("./storage");
const settings_1 = require("./settings");
const paths_1 = require("./paths");
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
                // getAccentColor returns RRGGBBAA, we only need RRGGBB
                return `#${accentColor.slice(0, 6)}`;
            }
            catch {
                return null;
            }
        }
        return null;
    });
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
}
