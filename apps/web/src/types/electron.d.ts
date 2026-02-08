// Type declarations for Electron API exposed via preload script
// This allows TypeScript to recognize window.electronAPI in the renderer

export interface StoredItem {
  id: string;
  type: "note" | "image" | "link" | "reminder";
  content: string;
  tags: string[];
  createdAt: string;
  imagePath?: string;
}

declare global {
  interface Window {
    electronAPI?: {
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
      // Storage API
      loadItems: () => Promise<StoredItem[]>;
      saveItems: (items: StoredItem[]) => Promise<void>;
      addItem: (item: StoredItem) => Promise<void>;
      deleteItem: (id: string) => Promise<void>;
      updateItem: (item: StoredItem) => Promise<void>;
      saveImage: (
        imageData: string,
        filename: string,
      ) => Promise<{ success: boolean; path?: string; error?: string }>;
      getImagesPath: () => Promise<string>;
      getStoragePath: () => Promise<string>;
    };
  }
}

export {};
