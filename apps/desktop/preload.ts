import { contextBridge, ipcRenderer } from "electron";

// Stored item type (dates as ISO strings for serialization)
interface StoredItem {
  id: string;
  type: "note" | "image" | "link" | "reminder";
  content: string;
  tags: string[];
  createdAt: string;
  reminder?: string;
  imageUrl?: string;
}

interface TrashedItem {
  item: StoredItem;
  deletedAt: string;
}

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
  // Accent color (Windows only)
  getWindowsAccentColor: () => ipcRenderer.invoke("accent:getWindowsColor"),
  // Items storage
  loadItems: () => ipcRenderer.invoke("items:load"),
  saveItems: (items: StoredItem[]) => ipcRenderer.invoke("items:save", items),
  addItem: (item: StoredItem) => ipcRenderer.invoke("items:add", item),
  deleteItem: (id: string) => ipcRenderer.invoke("items:delete", id),
  updateItem: (item: StoredItem) => ipcRenderer.invoke("items:update", item),
  // Image storage
  saveImage: (imageData: string, filename: string) =>
    ipcRenderer.invoke("images:save", imageData, filename),
  getImagesPath: () => ipcRenderer.invoke("images:getPath"),
  // Storage path
  getStoragePath: () => ipcRenderer.invoke("storage:getPath"),
  // Trash
  loadTrash: () => ipcRenderer.invoke("trash:load"),
  restoreFromTrash: (id: string) => ipcRenderer.invoke("trash:restore", id),
  deleteFromTrash: (id: string) => ipcRenderer.invoke("trash:delete", id),
  emptyTrash: () => ipcRenderer.invoke("trash:empty"),
  cleanupTrash: () => ipcRenderer.invoke("trash:cleanup"),
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
      getWindowsAccentColor: () => Promise<string | null>;
      // Items storage
      loadItems: () => Promise<StoredItem[]>;
      saveItems: (items: StoredItem[]) => Promise<{ success: boolean }>;
      addItem: (
        item: StoredItem,
      ) => Promise<{ success: boolean; items: StoredItem[] }>;
      deleteItem: (
        id: string,
      ) => Promise<{ success: boolean; items: StoredItem[] }>;
      updateItem: (
        item: StoredItem,
      ) => Promise<{ success: boolean; items: StoredItem[] }>;
      // Image storage
      saveImage: (
        imageData: string,
        filename: string,
      ) => Promise<{ success: boolean; path?: string; error?: string }>;
      getImagesPath: () => Promise<string>;
      // Storage path
      getStoragePath: () => Promise<string>;
      // Trash
      loadTrash: () => Promise<TrashedItem[]>;
      restoreFromTrash: (
        id: string,
      ) => Promise<{ success: boolean; item?: StoredItem }>;
      deleteFromTrash: (id: string) => Promise<{ success: boolean }>;
      emptyTrash: () => Promise<{ success: boolean }>;
      cleanupTrash: () => Promise<{ success: boolean; deletedCount: number }>;
    };
  }
}
