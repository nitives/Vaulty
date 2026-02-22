/**
 * Safely access the Electron API bridge.
 * Returns `window.electronAPI` when running inside Electron, or `null` otherwise.
 */
export function getElectronAPI() {
  if (typeof window !== "undefined" && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
}
