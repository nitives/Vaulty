import fs from "fs";
import path from "path";
import {
  getVaultyDataPath,
  getItemsFilePath,
  getFoldersFilePath,
  getPagesFilePath,
  getImagesPath,
  getAudiosPath,
  getTrashPath,
  getTrashFilePath,
  getTrashImagesPath,
  getTrashAudiosPath,
  getLegacyPulsesConfigPath,
  getPulsesFilePath,
  getPulseItemsFilePath,
  getPulsesConfigPath,
} from "./paths";

export interface StoredItem {
  id: string;
  type: "note" | "image" | "link" | "reminder" | "audio" | "video";
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

export interface StoredFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface StoredPage {
  id: string;
  folderId: string | null;
  name: string;
  createdAt: string;
}

export interface TrashedItem {
  item: StoredItem;
  deletedAt: string; // ISO date string
}

export interface StoredPulse {
  id: string;
  name: string;
  heartbeat: string;
  lastChecked: string | null;
  lastAnchorValue: string | null;
  enabled: boolean;
  addedAt: string;
  filePath?: string;
}

export interface StoredPulseItem {
  id: string; // Unique ID
  pulseId: string;
  title: string;
  content: string; // HTML or Text
  url?: string;
  isSeen: boolean;
  createdAt: string;
  expiresAt?: string;
  anchorValue?: string;
}

function asIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeHeartbeat(value: unknown): string {
  if (typeof value !== "string") {
    return "1h";
  }

  const heartbeat = value.trim().toLowerCase();
  if (!heartbeat) {
    return "1h";
  }

  // Supports 15m, 1h, 2d
  if (/^\d+\s*[mhd]$/.test(heartbeat)) {
    return heartbeat.replace(/\s+/g, "");
  }

  return "1h";
}

function normalizePulse(raw: unknown): StoredPulse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!id) {
    return null;
  }

  const nowIso = new Date().toISOString();

  return {
    id,
    name:
      typeof data.name === "string" && data.name.trim()
        ? data.name.trim()
        : id,
    heartbeat: normalizeHeartbeat(data.heartbeat),
    lastChecked: asIsoDate(data.lastChecked),
    lastAnchorValue:
      typeof data.lastAnchorValue === "string" ? data.lastAnchorValue : null,
    enabled: typeof data.enabled === "boolean" ? data.enabled : true,
    addedAt: asIsoDate(data.addedAt) ?? nowIso,
    filePath:
      typeof data.filePath === "string" && data.filePath.trim()
        ? data.filePath
        : undefined,
  };
}

function normalizePulseItem(raw: unknown): StoredPulseItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id.trim() : "";
  const pulseId = typeof data.pulseId === "string" ? data.pulseId.trim() : "";

  if (!id || !pulseId) {
    return null;
  }

  const expiresAt = asIsoDate(data.expiresAt) ?? undefined;

  return {
    id,
    pulseId,
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : "Pulse Update",
    content: typeof data.content === "string" ? data.content : "",
    url: typeof data.url === "string" ? data.url : undefined,
    isSeen: Boolean(data.isSeen),
    createdAt: asIsoDate(data.createdAt) ?? new Date().toISOString(),
    expiresAt,
    anchorValue:
      typeof data.anchorValue === "string" ? data.anchorValue : undefined,
  };
}

function isExpiredPulseItem(item: StoredPulseItem, nowMs: number): boolean {
  if (!item.expiresAt) {
    return false;
  }
  return Date.parse(item.expiresAt) <= nowMs;
}

// Ensure data directories exist
export function ensureDataDirectories(): void {
  const dataPath = getVaultyDataPath();
  const imagesPath = getImagesPath();
  const audiosPath = getAudiosPath();
  const trashPath = getTrashPath();
  const trashImagesPath = getTrashImagesPath();
  const trashAudiosPath = getTrashAudiosPath();

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  if (!fs.existsSync(audiosPath)) {
    fs.mkdirSync(audiosPath, { recursive: true });
  }
  if (!fs.existsSync(trashPath)) {
    fs.mkdirSync(trashPath, { recursive: true });
  }
  if (!fs.existsSync(trashImagesPath)) {
    fs.mkdirSync(trashImagesPath, { recursive: true });
  }
  if (!fs.existsSync(trashAudiosPath)) {
    fs.mkdirSync(trashAudiosPath, { recursive: true });
  }

  const pulsesConfigPath = getPulsesConfigPath();
  const legacyPulsesConfigPath = getLegacyPulsesConfigPath();

  // Move old userData/pulses config directory to the Vault data root.
  if (
    legacyPulsesConfigPath !== pulsesConfigPath &&
    fs.existsSync(legacyPulsesConfigPath) &&
    fs.statSync(legacyPulsesConfigPath).isDirectory()
  ) {
    try {
      if (!fs.existsSync(pulsesConfigPath)) {
        fs.renameSync(legacyPulsesConfigPath, pulsesConfigPath);
      } else {
        fs.cpSync(legacyPulsesConfigPath, pulsesConfigPath, {
          recursive: true,
          force: false,
        });
        fs.rmSync(legacyPulsesConfigPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error("Failed to migrate legacy pulses folder:", err);
    }
  }

  if (!fs.existsSync(pulsesConfigPath)) {
    fs.mkdirSync(pulsesConfigPath, { recursive: true });
  }
}

export function loadItems(): StoredItem[] {
  try {
    ensureDataDirectories();
    const filePath = getItemsFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    const items: StoredItem[] = JSON.parse(data);
    let modified = false;

    // Backfill size for images
    for (const item of items) {
      if (item.type === "image" && item.imageUrl && item.size === undefined) {
        const filename = item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
          const imgPath = path.join(getImagesPath(), filename);
          if (fs.existsSync(imgPath)) {
            try {
              item.size = fs.statSync(imgPath).size;
              modified = true;
            } catch (e) {
              // Ignore errors if file can't be stat'd
            }
          }
        }
      }
    }

    if (modified) {
      saveItems(items);
    }

    return items;
  } catch (err) {
    console.error("Failed to load items:", err);
    return [];
  }
}

export function saveItems(items: StoredItem[]): void {
  try {
    ensureDataDirectories();
    fs.writeFileSync(getItemsFilePath(), JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Failed to save items:", err);
  }
}

export function loadFolders(): StoredFolder[] {
  try {
    ensureDataDirectories();
    const filePath = getFoldersFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load folders:", err);
    return [];
  }
}

export function saveFolders(folders: StoredFolder[]): void {
  try {
    ensureDataDirectories();
    fs.writeFileSync(getFoldersFilePath(), JSON.stringify(folders, null, 2));
  } catch (err) {
    console.error("Failed to save folders:", err);
  }
}

export function loadPages(): StoredPage[] {
  try {
    ensureDataDirectories();
    const filePath = getPagesFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load pages:", err);
    return [];
  }
}

export function savePages(pages: StoredPage[]): void {
  try {
    ensureDataDirectories();
    fs.writeFileSync(getPagesFilePath(), JSON.stringify(pages, null, 2));
  } catch (err) {
    console.error("Failed to save pages:", err);
  }
}

export function loadPulses(): StoredPulse[] {
  try {
    ensureDataDirectories();
    const filePath = getPulsesFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    let modified = false;
    const normalized: StoredPulse[] = [];

    for (const rawPulse of parsed) {
      const pulse = normalizePulse(rawPulse);
      if (!pulse) {
        modified = true;
        continue;
      }

      normalized.push(pulse);
      if (
        JSON.stringify(rawPulse) !== JSON.stringify(pulse)
      ) {
        modified = true;
      }
    }

    if (modified) {
      savePulses(normalized);
    }

    return normalized;
  } catch (err) {
    console.error("Failed to load pulses:", err);
    return [];
  }
}

export function savePulses(pulses: StoredPulse[]): void {
  try {
    ensureDataDirectories();
    fs.writeFileSync(getPulsesFilePath(), JSON.stringify(pulses, null, 2));
  } catch (err) {
    console.error("Failed to save pulses:", err);
  }
}

export function loadPulseItems(): StoredPulseItem[] {
  try {
    ensureDataDirectories();
    const filePath = getPulseItemsFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    let modified = false;
    const nowMs = Date.now();
    const normalized: StoredPulseItem[] = [];

    for (const rawItem of parsed) {
      const item = normalizePulseItem(rawItem);
      if (!item) {
        modified = true;
        continue;
      }

      if (isExpiredPulseItem(item, nowMs)) {
        modified = true;
        continue;
      }

      normalized.push(item);
      if (JSON.stringify(rawItem) !== JSON.stringify(item)) {
        modified = true;
      }
    }

    if (modified) {
      savePulseItems(normalized);
    }

    return normalized;
  } catch (err) {
    console.error("Failed to load pulse items:", err);
    return [];
  }
}

export function savePulseItems(items: StoredPulseItem[]): void {
  try {
    ensureDataDirectories();
    fs.writeFileSync(getPulseItemsFilePath(), JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Failed to save pulse items:", err);
  }
}

export function saveImage(
  imageData: string,
  filename: string,
): { success: boolean; path?: string; size?: number; error?: string } {
  try {
    ensureDataDirectories();
    const imagesPath = getImagesPath();
    const filePath = path.join(imagesPath, filename);

    // imageData is base64 encoded
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(filePath, base64Data, "base64");
    const size = fs.statSync(filePath).size;

    // Return relative path so frontend can construct vaulty-image:// URLs correctly
    const relativePath = `images/${filename}`;
    return { success: true, path: relativePath, size };
  } catch (err) {
    console.error("Failed to save image:", err);
    return { success: false, error: String(err) };
  }
}

export function saveAudio(
  audioData: string,
  filename: string,
): { success: boolean; path?: string; size?: number; error?: string } {
  try {
    ensureDataDirectories();
    const audiosPath = getAudiosPath();
    const filePath = path.join(audiosPath, filename);

    // Strip out standard data-URI prefixes mapping audio types (audio/mp3, audio/mpeg...)
    const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "");
    fs.writeFileSync(filePath, base64Data, "base64");
    const size = fs.statSync(filePath).size;

    // Return relative path so frontend can construct vaulty-image:// URLs correctly
    const relativePath = `audios/${filename}`;
    return { success: true, path: relativePath, size };
  } catch (err) {
    console.error("Failed to save audio:", err);
    return { success: false, error: String(err) };
  }
}

// Trash functions
const TRASH_RETENTION_DAYS = 60;

export function loadTrash(): TrashedItem[] {
  try {
    ensureDataDirectories();
    const filePath = getTrashFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load trash:", err);
    return [];
  }
}

export function saveTrash(items: TrashedItem[]): void {
  try {
    ensureDataDirectories();
    fs.writeFileSync(getTrashFilePath(), JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Failed to save trash:", err);
  }
}

export function moveToTrash(item: StoredItem): void {
  const trash = loadTrash();
  const trashedItem: TrashedItem = {
    item,
    deletedAt: new Date().toISOString(),
  };

  if (item.imageUrl) {
    const filename = item.imageUrl.split(/[\\/]/).pop();
    if (filename) {
      if (item.type === "audio") {
        const srcPath = path.join(getAudiosPath(), filename);
        const destPath = path.join(getTrashAudiosPath(), filename);
        if (fs.existsSync(srcPath)) {
          fs.renameSync(srcPath, destPath);
        }
      } else {
        const srcPath = path.join(getImagesPath(), filename);
        const destPath = path.join(getTrashImagesPath(), filename);
        if (fs.existsSync(srcPath)) {
          fs.renameSync(srcPath, destPath);
        }
      }
    }
  }

  trash.unshift(trashedItem);
  saveTrash(trash);
}

export function restoreFromTrash(id: string): StoredItem | null {
  const trash = loadTrash();
  const index = trash.findIndex((t) => t.item.id === id);
  if (index === -1) return null;

  const trashedItem = trash[index];
  trash.splice(index, 1);
  saveTrash(trash);

  if (trashedItem.item.imageUrl) {
    const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
    if (filename) {
      if (trashedItem.item.type === "audio") {
        const srcPath = path.join(getTrashAudiosPath(), filename);
        const destPath = path.join(getAudiosPath(), filename);
        if (fs.existsSync(srcPath)) {
          fs.renameSync(srcPath, destPath);
        }
      } else {
        const srcPath = path.join(getTrashImagesPath(), filename);
        const destPath = path.join(getImagesPath(), filename);
        if (fs.existsSync(srcPath)) {
          fs.renameSync(srcPath, destPath);
        }
      }
    }
  }

  // Add back to items
  const items = loadItems();
  items.unshift(trashedItem.item);
  saveItems(items);

  return trashedItem.item;
}

export function permanentlyDeleteFromTrash(id: string): void {
  const trash = loadTrash();
  const index = trash.findIndex((t) => t.item.id === id);
  if (index === -1) return;

  const trashedItem = trash[index];

  if (trashedItem.item.imageUrl) {
    const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
    if (filename) {
      if (trashedItem.item.type === "audio") {
        const filePath = path.join(getTrashAudiosPath(), filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } else {
        const filePath = path.join(getTrashImagesPath(), filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }

  trash.splice(index, 1);
  saveTrash(trash);
}

export function emptyTrash(): void {
  const trash = loadTrash();

  for (const trashedItem of trash) {
    if (trashedItem.item.imageUrl) {
      const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
      if (filename) {
        if (trashedItem.item.type === "audio") {
          const filePath = path.join(getTrashAudiosPath(), filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } else {
          const filePath = path.join(getTrashImagesPath(), filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }
  }

  saveTrash([]);
}

export function cleanupOldTrash(): number {
  const trash = loadTrash();
  const now = Date.now();
  const retentionMs = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  const remaining = trash.filter((trashedItem) => {
    const deletedAt = new Date(trashedItem.deletedAt).getTime();
    const age = now - deletedAt;

    if (age > retentionMs) {
      if (trashedItem.item.imageUrl) {
        const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
          if (trashedItem.item.type === "audio") {
            const filePath = path.join(getTrashAudiosPath(), filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } else {
            const filePath = path.join(getTrashImagesPath(), filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }
      }
      deletedCount++;
      return false;
    }
    return true;
  });

  if (deletedCount > 0) {
    saveTrash(remaining);
    console.log(
      `Cleaned up ${deletedCount} items from trash (older than ${TRASH_RETENTION_DAYS} days)`,
    );
  }

  return deletedCount;
}

export function clearAllData(): void {
  try {
    ensureDataDirectories();

    // Clear items.json
    saveItems([]);

    // Clear folders.json and pages.json
    saveFolders([]);
    savePages([]);

    // Clear pulses
    savePulses([]);
    savePulseItems([]);

    // Clear trash.json
    saveTrash([]);

    // Delete all images
    const imagesPath = getImagesPath();
    if (fs.existsSync(imagesPath)) {
      const files = fs.readdirSync(imagesPath);
      for (const file of files) {
        fs.unlinkSync(path.join(imagesPath, file));
      }
    }

    // Delete all audios
    const audiosPath = getAudiosPath();
    if (fs.existsSync(audiosPath)) {
      const files = fs.readdirSync(audiosPath);
      for (const file of files) {
        fs.unlinkSync(path.join(audiosPath, file));
      }
    }

    // Delete all trash images
    const trashImagesPath = getTrashImagesPath();
    if (fs.existsSync(trashImagesPath)) {
      const files = fs.readdirSync(trashImagesPath);
      for (const file of files) {
        fs.unlinkSync(path.join(trashImagesPath, file));
      }
    }

    // Delete all trash audios
    const trashAudiosPath = getTrashAudiosPath();
    if (fs.existsSync(trashAudiosPath)) {
      const files = fs.readdirSync(trashAudiosPath);
      for (const file of files) {
        fs.unlinkSync(path.join(trashAudiosPath, file));
      }
    }
  } catch (err) {
    console.error("Failed to clear all data:", err);
  }
}
