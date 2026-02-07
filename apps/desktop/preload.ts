import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("app:version"),
  getName: () => ipcRenderer.invoke("app:name"),
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  maximizeWindow: () => ipcRenderer.invoke("window:maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  // Settings (single object get/set)
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch: Record<string, unknown>) =>
    ipcRenderer.invoke("settings:set", patch),
  // Theme sync (sets nativeTheme.themeSource in main process)
  setNativeTheme: (theme: string) => ipcRenderer.invoke("theme:set", theme),
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getName: () => Promise<string>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      getSettings: () => Promise<Record<string, unknown>>;
      setSettings: (
        patch: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
      setNativeTheme: (theme: string) => Promise<void>;
    };
  }
}
