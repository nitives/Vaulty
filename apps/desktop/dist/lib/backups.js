"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pruneVaultBackupsFromSettings = pruneVaultBackupsFromSettings;
exports.getVaultBackupStatus = getVaultBackupStatus;
exports.createVaultBackup = createVaultBackup;
exports.runScheduledVaultBackupIfDue = runScheduledVaultBackupIfDue;
exports.startVaultBackupScheduler = startVaultBackupScheduler;
exports.stopVaultBackupScheduler = stopVaultBackupScheduler;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
const settings_1 = require("./settings");
const storage_1 = require("./storage");
const BACKUP_CHECK_INTERVAL_MS = 60 * 1000;
const DEFAULT_BACKUP_RETENTION = 5;
const BACKUP_INTERVAL_MS = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
};
let backupTimer = null;
let backupInProgress = false;
function backupFolderName(date) {
    return `vaulty-backup-${date.toISOString().replace(/[:.]/g, "-")}`;
}
function normalizeBackupRetention(value) {
    if (value === "infinite")
        return "infinite";
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return DEFAULT_BACKUP_RETENTION;
    }
    return Math.max(1, Math.floor(value));
}
function copyVaultContents(sourceRoot, backupRoot) {
    const entries = fs_1.default.readdirSync(sourceRoot, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === "backups")
            continue;
        const sourcePath = path_1.default.join(sourceRoot, entry.name);
        const destinationPath = path_1.default.join(backupRoot, entry.name);
        fs_1.default.cpSync(sourcePath, destinationPath, {
            recursive: entry.isDirectory(),
            force: true,
        });
    }
}
function intervalForFrequency(frequency) {
    if (!frequency || frequency === "off")
        return null;
    return BACKUP_INTERVAL_MS[frequency];
}
function listBackupFolders(backupsPath) {
    if (!fs_1.default.existsSync(backupsPath))
        return [];
    return fs_1.default
        .readdirSync(backupsPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("vaulty-backup-"))
        .map((entry) => {
        const backupPath = path_1.default.join(backupsPath, entry.name);
        const stat = fs_1.default.statSync(backupPath);
        return {
            path: backupPath,
            createdAtMs: stat.birthtimeMs || stat.mtimeMs,
        };
    })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
}
function pruneVaultBackupsFromSettings() {
    try {
        const retention = normalizeBackupRetention((0, settings_1.loadSettings)().vaultBackupRetention);
        if (retention === "infinite") {
            return { success: true, deletedCount: 0 };
        }
        const backups = listBackupFolders((0, paths_1.getBackupsPath)());
        const oldBackups = backups.slice(retention);
        for (const backup of oldBackups) {
            fs_1.default.rmSync(backup.path, { recursive: true, force: true });
        }
        return { success: true, deletedCount: oldBackups.length };
    }
    catch (err) {
        return { success: false, deletedCount: 0, error: String(err) };
    }
}
function getVaultBackupStatus() {
    const settings = (0, settings_1.loadSettings)();
    return {
        frequency: settings.vaultBackupFrequency ?? "off",
        retention: normalizeBackupRetention(settings.vaultBackupRetention),
        backupsPath: (0, paths_1.getBackupsPath)(),
        lastBackupAt: settings.lastVaultBackupAt,
    };
}
function createVaultBackup() {
    if (backupInProgress) {
        return { success: false, error: "A backup is already running." };
    }
    backupInProgress = true;
    try {
        (0, storage_1.ensureDataDirectories)();
        const sourceRoot = (0, paths_1.getVaultyDataPath)();
        const backupsPath = (0, paths_1.getBackupsPath)();
        fs_1.default.mkdirSync(backupsPath, { recursive: true });
        const destinationPath = path_1.default.join(backupsPath, backupFolderName(new Date()));
        fs_1.default.mkdirSync(destinationPath, { recursive: true });
        copyVaultContents(sourceRoot, destinationPath);
        const settings = (0, settings_1.loadSettings)();
        const updated = {
            ...settings,
            lastVaultBackupAt: new Date().toISOString(),
        };
        (0, settings_1.saveSettings)(updated);
        pruneVaultBackupsFromSettings();
        return { success: true, path: destinationPath };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
    finally {
        backupInProgress = false;
    }
}
function runScheduledVaultBackupIfDue() {
    const settings = (0, settings_1.loadSettings)();
    const interval = intervalForFrequency(settings.vaultBackupFrequency);
    if (!interval)
        return;
    const lastBackupMs = settings.lastVaultBackupAt
        ? Date.parse(settings.lastVaultBackupAt)
        : 0;
    if (lastBackupMs && Date.now() - lastBackupMs < interval)
        return;
    const result = createVaultBackup();
    if (!result.success) {
        console.error("Vaulty scheduled backup failed:", result.error);
    }
}
function startVaultBackupScheduler() {
    stopVaultBackupScheduler();
    runScheduledVaultBackupIfDue();
    backupTimer = setInterval(runScheduledVaultBackupIfDue, BACKUP_CHECK_INTERVAL_MS);
}
function stopVaultBackupScheduler() {
    if (!backupTimer)
        return;
    clearInterval(backupTimer);
    backupTimer = null;
}
