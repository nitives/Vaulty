"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getVersion: () => electron_1.ipcRenderer.invoke("app:version"),
    getName: () => electron_1.ipcRenderer.invoke("app:name"),
});
