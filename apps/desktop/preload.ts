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
  size?: number;
  analyzed?: {
    tags: string[];
    content: string;
  };
}

interface TrashedItem {
  item: StoredItem;
  deletedAt: string;
}

type UpdateState =
  | "idle"
  | "checking"
  | "update-available"
  | "no-update"
  | "downloading"
  | "downloaded"
  | "error"
  | "disabled-in-dev";

interface UpdateStatusPayload {
  state: UpdateState;
  currentVersion?: string;
  availableVersion?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

type UpdateStatusListener = (status: UpdateStatusPayload) => void;

function onUpdateStatus(callback: UpdateStatusListener): () => void {
  const listener = (
    _event: Electron.IpcRendererEvent,
    payload: UpdateStatusPayload,
  ) => {
    callback(payload);
  };

  ipcRenderer.on("updates:status", listener);
  return () => ipcRenderer.removeListener("updates:status", listener);
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
  onAccentColorChanged: (callback: (color: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, color: string) =>
      callback(color);
    ipcRenderer.on("accent:changed", listener);
    return () => ipcRenderer.removeListener("accent:changed", listener);
  },
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
  changeStoragePath: () => ipcRenderer.invoke("storage:changePath"),
  clearAllData: () => ipcRenderer.invoke("storage:clearAll"),
  openTrashFolder: () => ipcRenderer.invoke("storage:openTrash"),
  // Trash
  loadTrash: () => ipcRenderer.invoke("trash:load"),
  restoreFromTrash: (id: string) => ipcRenderer.invoke("trash:restore", id),
  deleteFromTrash: (id: string) => ipcRenderer.invoke("trash:delete", id),
  emptyTrash: () => ipcRenderer.invoke("trash:empty"),
  cleanupTrash: () => ipcRenderer.invoke("trash:cleanup"),
  // Auto updates
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  downloadUpdate: () => ipcRenderer.invoke("updates:download"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  getUpdateStatus: () => ipcRenderer.invoke("updates:status"),
  onUpdateStatus,
  // Aliases for compatibility
  updaterCheck: () => ipcRenderer.invoke("updates:check"),
  updaterInstall: () => ipcRenderer.invoke("updates:install"),
  onUpdaterEvent: onUpdateStatus,
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
      onAccentColorChanged?: (callback: (color: string) => void) => () => void;
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
      ) => Promise<{
        success: boolean;
        path?: string;
        size?: number;
        error?: string;
      }>;
      getImagesPath: () => Promise<string>;
      // Storage path
      getStoragePath: () => Promise<string>;
      changeStoragePath: () => Promise<{
        success: boolean;
        path?: string;
        canceled?: boolean;
        error?: string;
      }>;
      clearAllData: () => Promise<{ success: boolean }>;
      openTrashFolder: () => Promise<{ success: boolean; error?: string }>;
      // Trash
      loadTrash: () => Promise<TrashedItem[]>;
      restoreFromTrash: (
        id: string,
      ) => Promise<{ success: boolean; item?: StoredItem }>;
      deleteFromTrash: (id: string) => Promise<{ success: boolean }>;
      emptyTrash: () => Promise<{ success: boolean }>;
      cleanupTrash: () => Promise<{ success: boolean; deletedCount: number }>;
      // Auto updates
      checkForUpdates: () => Promise<
        | { ok: true; status: string; version?: string }
        | { ok: false; reason: string }
      >;
      downloadUpdate: () => Promise<{
        ok: boolean;
        reason?: string;
        message?: string;
      }>;
      installUpdate: () => Promise<{ ok: boolean; reason?: string }>;
      getUpdateStatus: () => Promise<UpdateStatusPayload>;
      onUpdateStatus: (callback: UpdateStatusListener) => () => void;
      // Aliases for compatibility
      updaterCheck: () => Promise<
        | { ok: true; status: string; version?: string }
        | { ok: false; reason: string }
      >;
      updaterInstall: () => Promise<{ ok: boolean; reason?: string }>;
      onUpdaterEvent: (callback: UpdateStatusListener) => () => void;
    };
  }
}
