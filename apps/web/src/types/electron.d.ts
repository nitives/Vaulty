// Type declarations for Electron API exposed via preload script
// This allows TypeScript to recognize window.electronAPI in the renderer

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
    };
  }
}

export {};
