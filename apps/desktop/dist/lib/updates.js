"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAutoUpdates = setupAutoUpdates;
exports.getUpdateStatus = getUpdateStatus;
exports.canCheckForUpdates = canCheckForUpdates;
exports.checkForUpdates = checkForUpdates;
exports.downloadUpdate = downloadUpdate;
exports.quitAndInstall = quitAndInstall;
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const UPDATE_STATUS_CHANNEL = "updates:status";
function formatError(error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Cannot parse releases feed") ||
        msg.includes("HttpError: 406")) {
        return "Unable to check for updates. Please ensure a production release exists.";
    }
    return msg;
}
let getMainWindow = () => null;
let isConfigured = false;
let isChecking = false;
let isDownloading = false;
let lastKnownAvailableVersion;
let markQuitting = null;
let latestStatus = {
    state: "idle",
    currentVersion: electron_1.app.getVersion(),
};
function publishStatus(status) {
    latestStatus = {
        ...status,
        currentVersion: electron_1.app.getVersion(),
    };
    const win = getMainWindow();
    if (!win || win.isDestroyed())
        return;
    win.webContents.send(UPDATE_STATUS_CHANNEL, latestStatus);
}
function updatesDisabledInDev() {
    publishStatus({
        state: "disabled-in-dev",
        message: "Updates are disabled in dev mode. Package the app to test updates.",
    });
    return { status: "disabled-in-dev" };
}
function onUpdateAvailable(info) {
    isChecking = false;
    lastKnownAvailableVersion = info.version;
    publishStatus({
        state: "update-available",
        availableVersion: info.version,
        message: info.releaseName
            ? `Update ${info.releaseName} is available.`
            : `Update v${info.version} is available.`,
    });
}
function setupAutoUpdates(getWindow, onQuitting) {
    getMainWindow = getWindow;
    if (onQuitting)
        markQuitting = onQuitting;
    if (isConfigured)
        return;
    isConfigured = true;
    electron_updater_1.autoUpdater.autoDownload = false;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
    electron_updater_1.autoUpdater.logger = console;
    electron_updater_1.autoUpdater.on("checking-for-update", () => {
        publishStatus({
            state: "checking",
            message: "Checking for updates...",
        });
    });
    electron_updater_1.autoUpdater.on("update-available", onUpdateAvailable);
    electron_updater_1.autoUpdater.on("update-not-available", () => {
        isChecking = false;
        publishStatus({
            state: "no-update",
            message: "Vaulty is up to date.",
        });
    });
    electron_updater_1.autoUpdater.on("download-progress", (progress) => {
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
    });
    electron_updater_1.autoUpdater.on("update-downloaded", (info) => {
        isDownloading = false;
        lastKnownAvailableVersion = info.version;
        publishStatus({
            state: "downloaded",
            availableVersion: info.version,
            message: "Update downloaded. Restart to install.",
        });
    });
    electron_updater_1.autoUpdater.on("error", (error) => {
        isChecking = false;
        isDownloading = false;
        publishStatus({
            state: "error",
            availableVersion: lastKnownAvailableVersion,
            message: formatError(error),
        });
    });
}
function getUpdateStatus() {
    return latestStatus;
}
function canCheckForUpdates() {
    return electron_1.app.isPackaged;
}
async function checkForUpdates() {
    if (!canCheckForUpdates()) {
        return updatesDisabledInDev();
    }
    if (isChecking || isDownloading) {
        return { status: "busy", version: lastKnownAvailableVersion };
    }
    isChecking = true;
    try {
        const result = await electron_updater_1.autoUpdater.checkForUpdates();
        return {
            status: result?.updateInfo?.version &&
                result.updateInfo.version !== electron_1.app.getVersion()
                ? "update-available"
                : "no-update",
            version: result?.updateInfo?.version,
        };
    }
    catch (error) {
        isChecking = false;
        publishStatus({
            state: "error",
            availableVersion: lastKnownAvailableVersion,
            message: formatError(error),
        });
        return { status: "error" };
    }
    finally {
        isChecking = false;
    }
}
async function downloadUpdate() {
    if (!canCheckForUpdates()) {
        updatesDisabledInDev();
        return;
    }
    if (isChecking || isDownloading)
        return;
    isDownloading = true;
    try {
        await electron_updater_1.autoUpdater.downloadUpdate();
    }
    catch (error) {
        isDownloading = false;
        publishStatus({
            state: "error",
            availableVersion: lastKnownAvailableVersion,
            message: formatError(error),
        });
        throw error;
    }
    finally {
        isDownloading = false;
    }
}
function quitAndInstall() {
    if (!canCheckForUpdates()) {
        updatesDisabledInDev();
        return;
    }
    // Mark the app as quitting so the close-to-tray handler doesn't
    // intercept the close event and block the NSIS installer.
    markQuitting?.();
    electron_updater_1.autoUpdater.quitAndInstall();
}
