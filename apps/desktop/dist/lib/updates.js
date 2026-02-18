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
let getMainWindow = () => null;
let isConfigured = false;
let isChecking = false;
let isDownloading = false;
let downloadPromptOpen = false;
let restartPromptOpen = false;
let lastKnownAvailableVersion;
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
async function promptToDownload(version) {
    const win = getMainWindow();
    if (!win || win.isDestroyed() || downloadPromptOpen || isDownloading)
        return;
    downloadPromptOpen = true;
    try {
        const { response } = await electron_1.dialog.showMessageBox(win, {
            type: "info",
            title: "Update Available",
            message: version
                ? `Update available (v${version}). Download now?`
                : "An update is available. Download now?",
            detail: "A newer version of Vaulty is available. You can continue using the app while it downloads.",
            buttons: ["Download", "Later"],
            defaultId: 0,
            cancelId: 1,
        });
        if (response === 0) {
            await downloadUpdate();
        }
    }
    finally {
        downloadPromptOpen = false;
    }
}
async function promptToRestart(version) {
    const win = getMainWindow();
    if (!win || win.isDestroyed() || restartPromptOpen)
        return;
    restartPromptOpen = true;
    try {
        const { response } = await electron_1.dialog.showMessageBox(win, {
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
    }
    finally {
        restartPromptOpen = false;
    }
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
    void promptToDownload(info.version);
}
function setupAutoUpdates(getWindow) {
    getMainWindow = getWindow;
    if (isConfigured)
        return;
    isConfigured = true;
    electron_updater_1.autoUpdater.autoDownload = false;
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
        void promptToRestart(info.version);
    });
    electron_updater_1.autoUpdater.on("error", (error) => {
        isChecking = false;
        isDownloading = false;
        publishStatus({
            state: "error",
            availableVersion: lastKnownAvailableVersion,
            message: error?.message ?? String(error),
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
            message: error instanceof Error ? error.message : String(error),
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
            message: error instanceof Error ? error.message : String(error),
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
    electron_updater_1.autoUpdater.quitAndInstall();
}
