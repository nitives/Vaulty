"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
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
});
