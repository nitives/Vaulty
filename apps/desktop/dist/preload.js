"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
function onUpdateStatus(callback) {
    const listener = (_event, payload) => {
        callback(payload);
    };
    electron_1.ipcRenderer.on("updates:status", listener);
    return () => electron_1.ipcRenderer.removeListener("updates:status", listener);
}
// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getVersion: () => electron_1.ipcRenderer.invoke("app:version"),
    getName: () => electron_1.ipcRenderer.invoke("app:name"),
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.invoke("window:minimize"),
    maximizeWindow: () => electron_1.ipcRenderer.invoke("window:maximize"),
    closeWindow: () => electron_1.ipcRenderer.invoke("window:close"),
    isMaximized: () => electron_1.ipcRenderer.invoke("window:isMaximized"),
    // Settings (single object get/set)
    getSettings: () => electron_1.ipcRenderer.invoke("settings:get"),
    setSettings: (patch) => electron_1.ipcRenderer.invoke("settings:set", patch),
    // Theme sync (sets nativeTheme.themeSource in main process)
    setNativeTheme: (theme) => electron_1.ipcRenderer.invoke("theme:set", theme),
    // Accent color (Windows only)
    getWindowsAccentColor: () => electron_1.ipcRenderer.invoke("accent:getWindowsColor"),
    // Items storage
    loadItems: () => electron_1.ipcRenderer.invoke("items:load"),
    saveItems: (items) => electron_1.ipcRenderer.invoke("items:save", items),
    addItem: (item) => electron_1.ipcRenderer.invoke("items:add", item),
    deleteItem: (id) => electron_1.ipcRenderer.invoke("items:delete", id),
    updateItem: (item) => electron_1.ipcRenderer.invoke("items:update", item),
    // Image storage
    saveImage: (imageData, filename) => electron_1.ipcRenderer.invoke("images:save", imageData, filename),
    getImagesPath: () => electron_1.ipcRenderer.invoke("images:getPath"),
    // Storage path
    getStoragePath: () => electron_1.ipcRenderer.invoke("storage:getPath"),
    // Trash
    loadTrash: () => electron_1.ipcRenderer.invoke("trash:load"),
    restoreFromTrash: (id) => electron_1.ipcRenderer.invoke("trash:restore", id),
    deleteFromTrash: (id) => electron_1.ipcRenderer.invoke("trash:delete", id),
    emptyTrash: () => electron_1.ipcRenderer.invoke("trash:empty"),
    cleanupTrash: () => electron_1.ipcRenderer.invoke("trash:cleanup"),
    // Auto updates
    checkForUpdates: () => electron_1.ipcRenderer.invoke("updates:check"),
    downloadUpdate: () => electron_1.ipcRenderer.invoke("updates:download"),
    installUpdate: () => electron_1.ipcRenderer.invoke("updates:install"),
    getUpdateStatus: () => electron_1.ipcRenderer.invoke("updates:status"),
    onUpdateStatus,
    // Aliases for compatibility
    updaterCheck: () => electron_1.ipcRenderer.invoke("updates:check"),
    updaterInstall: () => electron_1.ipcRenderer.invoke("updates:install"),
    onUpdaterEvent: onUpdateStatus,
});
