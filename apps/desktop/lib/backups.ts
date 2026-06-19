import fs from "fs";
import path from "path";
import { getBackupsPath, getVaultyDataPath } from "./paths";
import {
  loadSettings,
  saveSettings,
  type VaultBackupFrequency,
  type VaultBackupRetention,
} from "./settings";
import { ensureDataDirectories } from "./storage";

const BACKUP_CHECK_INTERVAL_MS = 60 * 1000;
const DEFAULT_BACKUP_RETENTION = 5;
const BACKUP_INTERVAL_MS: Record<Exclude<VaultBackupFrequency, "off">, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

let backupTimer: NodeJS.Timeout | null = null;
let backupInProgress = false;

function backupFolderName(date: Date): string {
  return `vaulty-backup-${date.toISOString().replace(/[:.]/g, "-")}`;
}

function normalizeBackupRetention(
  value?: VaultBackupRetention,
): VaultBackupRetention {
  if (value === "infinite") return "infinite";
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_BACKUP_RETENTION;
  }
  return Math.max(1, Math.floor(value));
}

function copyVaultContents(sourceRoot: string, backupRoot: string): void {
  const entries = fs.readdirSync(sourceRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "backups") continue;

    const sourcePath = path.join(sourceRoot, entry.name);
    const destinationPath = path.join(backupRoot, entry.name);
    fs.cpSync(sourcePath, destinationPath, {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
}

function intervalForFrequency(frequency?: VaultBackupFrequency): number | null {
  if (!frequency || frequency === "off") return null;
  return BACKUP_INTERVAL_MS[frequency];
}

function listBackupFolders(backupsPath: string): Array<{
  path: string;
  createdAtMs: number;
}> {
  if (!fs.existsSync(backupsPath)) return [];

  return fs
    .readdirSync(backupsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("vaulty-backup-"))
    .map((entry) => {
      const backupPath = path.join(backupsPath, entry.name);
      const stat = fs.statSync(backupPath);
      return {
        path: backupPath,
        createdAtMs: stat.birthtimeMs || stat.mtimeMs,
      };
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function pruneVaultBackupsFromSettings(): {
  success: boolean;
  deletedCount: number;
  error?: string;
} {
  try {
    const retention = normalizeBackupRetention(loadSettings().vaultBackupRetention);
    if (retention === "infinite") {
      return { success: true, deletedCount: 0 };
    }

    const backups = listBackupFolders(getBackupsPath());
    const oldBackups = backups.slice(retention);
    for (const backup of oldBackups) {
      fs.rmSync(backup.path, { recursive: true, force: true });
    }

    return { success: true, deletedCount: oldBackups.length };
  } catch (err) {
    return { success: false, deletedCount: 0, error: String(err) };
  }
}

export function getVaultBackupStatus(): {
  frequency: VaultBackupFrequency;
  retention: VaultBackupRetention;
  backupsPath: string;
  lastBackupAt?: string;
} {
  const settings = loadSettings();
  return {
    frequency: settings.vaultBackupFrequency ?? "off",
    retention: normalizeBackupRetention(settings.vaultBackupRetention),
    backupsPath: getBackupsPath(),
    lastBackupAt: settings.lastVaultBackupAt,
  };
}

export function createVaultBackup(): {
  success: boolean;
  path?: string;
  error?: string;
} {
  if (backupInProgress) {
    return { success: false, error: "A backup is already running." };
  }

  backupInProgress = true;

  try {
    ensureDataDirectories();
    const sourceRoot = getVaultyDataPath();
    const backupsPath = getBackupsPath();
    fs.mkdirSync(backupsPath, { recursive: true });

    const destinationPath = path.join(backupsPath, backupFolderName(new Date()));
    fs.mkdirSync(destinationPath, { recursive: true });
    copyVaultContents(sourceRoot, destinationPath);

    const settings = loadSettings();
    const updated = {
      ...settings,
      lastVaultBackupAt: new Date().toISOString(),
    };
    saveSettings(updated);
    pruneVaultBackupsFromSettings();

    return { success: true, path: destinationPath };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    backupInProgress = false;
  }
}

export function runScheduledVaultBackupIfDue(): void {
  const settings = loadSettings();
  const interval = intervalForFrequency(settings.vaultBackupFrequency);
  if (!interval) return;

  const lastBackupMs = settings.lastVaultBackupAt
    ? Date.parse(settings.lastVaultBackupAt)
    : 0;
  if (lastBackupMs && Date.now() - lastBackupMs < interval) return;

  const result = createVaultBackup();
  if (!result.success) {
    console.error("Vaulty scheduled backup failed:", result.error);
  }
}

export function startVaultBackupScheduler(): void {
  stopVaultBackupScheduler();
  runScheduledVaultBackupIfDue();
  backupTimer = setInterval(runScheduledVaultBackupIfDue, BACKUP_CHECK_INTERVAL_MS);
}

export function stopVaultBackupScheduler(): void {
  if (!backupTimer) return;
  clearInterval(backupTimer);
  backupTimer = null;
}
