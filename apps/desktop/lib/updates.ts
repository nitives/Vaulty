import { app, BrowserWindow, dialog } from "electron";
import { autoUpdater, type UpdateInfo } from "electron-updater";

export type UpdateState =
  | "idle"
  | "checking"
  | "update-available"
  | "no-update"
  | "downloading"
  | "downloaded"
  | "error"
  | "disabled-in-dev";

export interface UpdateStatusPayload {
  state: UpdateState;
  currentVersion?: string;
  availableVersion?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

export interface CheckForUpdatesResult {
  status: UpdateState | "busy";
  version?: string;
}

const UPDATE_STATUS_CHANNEL = "updates:status";

let getMainWindow: () => BrowserWindow | null = () => null;
let isConfigured = false;
let isChecking = false;
let isDownloading = false;
let downloadPromptOpen = false;
let restartPromptOpen = false;
let lastKnownAvailableVersion: string | undefined;

let latestStatus: UpdateStatusPayload = {
  state: "idle",
  currentVersion: app.getVersion(),
};

function publishStatus(status: UpdateStatusPayload): void {
  latestStatus = {
    ...status,
    currentVersion: app.getVersion(),
  };

  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send(UPDATE_STATUS_CHANNEL, latestStatus);
}

function updatesDisabledInDev(): CheckForUpdatesResult {
  publishStatus({
    state: "disabled-in-dev",
    message: "Updates are disabled in dev mode. Package the app to test updates.",
  });
  return { status: "disabled-in-dev" };
}

async function promptToDownload(version?: string): Promise<void> {
  const win = getMainWindow();
  if (!win || win.isDestroyed() || downloadPromptOpen || isDownloading) return;

  downloadPromptOpen = true;
  try {
    const { response } = await dialog.showMessageBox(win, {
      type: "info",
      title: "Update Available",
      message: version
        ? `Update available (v${version}). Download now?`
        : "An update is available. Download now?",
      detail:
        "A newer version of Vaulty is available. You can continue using the app while it downloads.",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      await downloadUpdate();
    }
  } finally {
    downloadPromptOpen = false;
  }
}

async function promptToRestart(version?: string): Promise<void> {
  const win = getMainWindow();
  if (!win || win.isDestroyed() || restartPromptOpen) return;

  restartPromptOpen = true;
  try {
    const { response } = await dialog.showMessageBox(win, {
      type: "info",
      title: "Update Ready",
      message: version
        ? `Update v${version} downloaded. Restart now to install?`
        : "Update downloaded. Restart now to install?",
      buttons: ["Restart and Install", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      quitAndInstall();
    }
  } finally {
    restartPromptOpen = false;
  }
}

function onUpdateAvailable(info: UpdateInfo): void {
  isChecking = false;
  lastKnownAvailableVersion = info.version;

  publishStatus({
    state: "update-available",
    availableVersion: info.version,
    message: info.releaseName
      ? `Update ${info.releaseName} is available.`
      : `Update v${info.version} is available.`,
  });

  void promptToDownload(info.version);
}

export function setupAutoUpdates(getWindow: () => BrowserWindow | null): void {
  getMainWindow = getWindow;

  if (isConfigured) return;
  isConfigured = true;

  autoUpdater.autoDownload = false;
  autoUpdater.logger = console;

  autoUpdater.on("checking-for-update", () => {
    publishStatus({
      state: "checking",
      message: "Checking for updates...",
    });
  });

  autoUpdater.on("update-available", onUpdateAvailable);

  autoUpdater.on("update-not-available", () => {
    isChecking = false;
    publishStatus({
      state: "no-update",
      message: "Vaulty is up to date.",
    });
  });

  autoUpdater.on(
    "download-progress",
    (progress: {
      percent: number;
      bytesPerSecond: number;
      transferred: number;
      total: number;
    }) => {
      isDownloading = true;
      publishStatus({
        state: "downloading",
        availableVersion: lastKnownAvailableVersion,
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
        message: "Downloading update...",
      });
    },
  );

  autoUpdater.on("update-downloaded", (info: { version: string }) => {
    isDownloading = false;
    lastKnownAvailableVersion = info.version;

    publishStatus({
      state: "downloaded",
      availableVersion: info.version,
      message: "Update downloaded. Restart to install.",
    });

    void promptToRestart(info.version);
  });

  autoUpdater.on("error", (error: Error) => {
    isChecking = false;
    isDownloading = false;
    publishStatus({
      state: "error",
      availableVersion: lastKnownAvailableVersion,
      message: error?.message ?? String(error),
    });
  });
}

export function getUpdateStatus(): UpdateStatusPayload {
  return latestStatus;
}

export function canCheckForUpdates(): boolean {
  return app.isPackaged;
}

export async function checkForUpdates(): Promise<CheckForUpdatesResult> {
  if (!canCheckForUpdates()) {
    return updatesDisabledInDev();
  }

  if (isChecking || isDownloading) {
    return { status: "busy", version: lastKnownAvailableVersion };
  }

  isChecking = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      status:
        result?.updateInfo?.version &&
        result.updateInfo.version !== app.getVersion()
          ? "update-available"
          : "no-update",
      version: result?.updateInfo?.version,
    };
  } catch (error) {
    isChecking = false;
    publishStatus({
      state: "error",
      availableVersion: lastKnownAvailableVersion,
      message: error instanceof Error ? error.message : String(error),
    });
    return { status: "error" };
  } finally {
    isChecking = false;
  }
}

export async function downloadUpdate(): Promise<void> {
  if (!canCheckForUpdates()) {
    updatesDisabledInDev();
    return;
  }

  if (isChecking || isDownloading) return;

  isDownloading = true;
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    isDownloading = false;
    publishStatus({
      state: "error",
      availableVersion: lastKnownAvailableVersion,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    isDownloading = false;
  }
}

export function quitAndInstall(): void {
  if (!canCheckForUpdates()) {
    updatesDisabledInDev();
    return;
  }
  autoUpdater.quitAndInstall();
}
