import fs from "fs";
import path from "path";
import {
  getVaultyDataPath,
  getItemsFilePath,
  getFoldersFilePath,
  getPagesFilePath,
  getImagesPath,
  getMetadataPath,
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
  updatedAt?: string;
  reminder?: string;
  imageUrl?: string;
  imageUrls?: string[];
  size?: number;
  analyzed?: {
    tags: string[];
    content: string;
  };
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
    artist?: string;
    album?: string;
    year?: string;
  };
  pageId?: string;
}

export interface StoredFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  parentFolderId: string | null;
}

export interface StoredPage {
  id: string;
  folderId: string | null;
  name: string;
  createdAt: string;
  updatedAt?: string;
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
      typeof data.name === "string" && data.name.trim() ? data.name.trim() : id,
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

function normalizeFolder(raw: unknown): StoredFolder | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!id) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const normalizedCreatedAt = asIsoDate(data.createdAt) ?? nowIso;
  const parentFolderId =
    typeof data.parentFolderId === "string" && data.parentFolderId.trim()
      ? data.parentFolderId.trim()
      : null;

  return {
    id,
    name:
      typeof data.name === "string" && data.name.trim() ? data.name.trim() : id,
    createdAt: normalizedCreatedAt,
    parentFolderId: parentFolderId === id ? null : parentFolderId,
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
  const metadataPath = getMetadataPath();
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
  if (!fs.existsSync(metadataPath)) {
    fs.mkdirSync(metadataPath, { recursive: true });
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
      const imagePaths =
        item.type === "image" && item.imageUrls && item.imageUrls.length > 0
          ? item.imageUrls
          : item.type === "image" && item.imageUrl
            ? [item.imageUrl]
            : [];

      if (imagePaths.length > 0 && item.size === undefined) {
        let totalSize = 0;
        for (const imagePath of imagePaths) {
          const filename = imagePath.split(/[\\/]/).pop();
          if (filename) {
            const imgPath = path.join(getImagesPath(), filename);
            if (fs.existsSync(imgPath)) {
              try {
                totalSize += fs.statSync(imgPath).size;
              } catch (e) {
                // Ignore errors if file can't be stat'd
              }
            }
          }
        }
        if (totalSize > 0) {
          item.size = totalSize;
          modified = true;
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
    const parsed = JSON.parse(data) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    let modified = false;
    const normalized: StoredFolder[] = [];

    for (const rawFolder of parsed) {
      const folder = normalizeFolder(rawFolder);
      if (!folder) {
        modified = true;
        continue;
      }
      normalized.push(folder);
      if (JSON.stringify(rawFolder) !== JSON.stringify(folder)) {
        modified = true;
      }
    }

    const folderById = new Map(normalized.map((folder) => [folder.id, folder]));
    for (const folder of normalized) {
      if (!folder.parentFolderId) {
        continue;
      }

      if (!folderById.has(folder.parentFolderId)) {
        folder.parentFolderId = null;
        modified = true;
        continue;
      }

      // Break ancestry cycles (A -> B -> A).
      const seen = new Set<string>([folder.id]);
      let currentParentId: string | null = folder.parentFolderId;
      while (currentParentId) {
        if (seen.has(currentParentId)) {
          folder.parentFolderId = null;
          modified = true;
          break;
        }

        seen.add(currentParentId);
        const parent = folderById.get(currentParentId);
        currentParentId = parent?.parentFolderId ?? null;
      }
    }

    if (modified) {
      saveFolders(normalized);
    }

    return normalized;
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
      if (JSON.stringify(rawPulse) !== JSON.stringify(pulse)) {
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

function getSafeMediaFileTarget(
  baseDirectory: string,
  filename: string,
): { filename: string; filePath: string } | null {
  if (typeof filename !== "string") return null;

  const safeFilename = filename.trim();
  if (
    !safeFilename ||
    safeFilename === "." ||
    safeFilename === ".." ||
    safeFilename.includes("\0") ||
    safeFilename.includes("/") ||
    safeFilename.includes("\\") ||
    /^[a-zA-Z]:/.test(safeFilename) ||
    path.isAbsolute(safeFilename)
  ) {
    return null;
  }

  const basePath = path.resolve(baseDirectory);
  const filePath = path.resolve(basePath, safeFilename);
  if (filePath === basePath || !filePath.startsWith(`${basePath}${path.sep}`)) {
    return null;
  }

  return { filename: safeFilename, filePath };
}

export function saveImage(
  imageData: string,
  filename: string,
): { success: boolean; path?: string; size?: number; error?: string } {
  try {
    ensureDataDirectories();
    const imagesPath = getImagesPath();
    const target = getSafeMediaFileTarget(imagesPath, filename);
    if (!target) {
      return { success: false, error: "Invalid image filename." };
    }

    // imageData is base64 encoded
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(target.filePath, base64Data, "base64");
    const size = fs.statSync(target.filePath).size;

    // Return relative path so frontend can construct vaulty-image:// URLs correctly
    const relativePath = `images/${target.filename}`;
    return { success: true, path: relativePath, size };
  } catch (err) {
    console.error("Failed to save image:", err);
    return { success: false, error: String(err) };
  }
}

export function saveMetadataImage(
  imageData: string,
  filename: string,
): { success: boolean; path?: string; size?: number; error?: string } {
  try {
    ensureDataDirectories();
    const metadataPath = getMetadataPath();
    const target = getSafeMediaFileTarget(metadataPath, filename);
    if (!target) {
      return { success: false, error: "Invalid metadata image filename." };
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(target.filePath, base64Data, "base64");
    const size = fs.statSync(target.filePath).size;

    const relativePath = `metadata/${target.filename}`;
    return { success: true, path: relativePath, size };
  } catch (err) {
    console.error("Failed to save metadata image:", err);
    return { success: false, error: String(err) };
  }
}

export function saveAudioImage(
  imageData: string,
  filename: string,
): { success: boolean; path?: string; size?: number; error?: string } {
  try {
    ensureDataDirectories();
    const audiosPath = getAudiosPath();
    const target = getSafeMediaFileTarget(audiosPath, filename);
    if (!target) {
      return { success: false, error: "Invalid audio image filename." };
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(target.filePath, base64Data, "base64");
    const size = fs.statSync(target.filePath).size;

    const relativePath = `audios/${target.filename}`;
    return { success: true, path: relativePath, size };
  } catch (err) {
    console.error("Failed to save audio image:", err);
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
    const target = getSafeMediaFileTarget(audiosPath, filename);
    if (!target) {
      return { success: false, error: "Invalid audio filename." };
    }

    // Strip out standard data-URI prefixes mapping audio types (audio/mp3, audio/mpeg...)
    const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "");
    fs.writeFileSync(target.filePath, base64Data, "base64");
    const size = fs.statSync(target.filePath).size;

    // Return relative path so frontend can construct vaulty-image:// URLs correctly
    const relativePath = `audios/${target.filename}`;
    return { success: true, path: relativePath, size };
  } catch (err) {
    console.error("Failed to save audio:", err);
    return { success: false, error: String(err) };
  }
}

const SYNCABLE_VAULT_FOLDERS = new Set(["images", "metadata", "audios"]);

function mimeTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeByExt: Record<string, string> = {
    ".aac": "audio/aac",
    ".aiff": "audio/aiff",
    ".avif": "image/avif",
    ".flac": "audio/flac",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".webp": "image/webp",
  };

  return mimeByExt[ext] ?? "application/octet-stream";
}

function normalizeVaultRelativePath(relativePath: string): string | null {
  if (typeof relativePath !== "string") return null;

  const cleaned = relativePath.trim().replace(/\\/g, "/");
  if (!cleaned || cleaned.startsWith("/") || /^[a-zA-Z]:/.test(cleaned)) {
    return null;
  }

  const normalized = path.posix.normalize(cleaned);
  if (
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return null;
  }

  const rootFolder = normalized.split("/")[0];
  if (!SYNCABLE_VAULT_FOLDERS.has(rootFolder)) {
    return null;
  }

  return normalized;
}

function getVaultFileAbsolutePath(relativePath: string): {
  normalized: string;
  filePath: string;
} | null {
  const normalized = normalizeVaultRelativePath(relativePath);
  if (!normalized) return null;

  const vaultRoot = path.resolve(getVaultyDataPath());
  const filePath = path.resolve(vaultRoot, normalized);
  if (filePath !== vaultRoot && filePath.startsWith(`${vaultRoot}${path.sep}`)) {
    return { normalized, filePath };
  }

  return null;
}

export function vaultFileExists(relativePath: string): {
  success: boolean;
  exists: boolean;
  path?: string;
  updatedAt?: string;
  size?: number;
  error?: string;
} {
  try {
    ensureDataDirectories();
    const resolved = getVaultFileAbsolutePath(relativePath);
    if (!resolved) {
      return { success: false, exists: false, error: "Invalid vault file path." };
    }

    if (!fs.existsSync(resolved.filePath)) {
      return { success: true, exists: false, path: resolved.normalized };
    }

    const stat = fs.statSync(resolved.filePath);
    return {
      success: true,
      exists: stat.isFile(),
      path: resolved.normalized,
      updatedAt: stat.mtime.toISOString(),
      size: stat.size,
    };
  } catch (err) {
    return { success: false, exists: false, error: String(err) };
  }
}

export function readVaultFile(relativePath: string): {
  success: boolean;
  path?: string;
  data?: string;
  mimeType?: string;
  size?: number;
  updatedAt?: string;
  error?: string;
} {
  try {
    ensureDataDirectories();
    const resolved = getVaultFileAbsolutePath(relativePath);
    if (!resolved) {
      return { success: false, error: "Invalid vault file path." };
    }

    if (!fs.existsSync(resolved.filePath)) {
      return { success: false, error: "Vault file does not exist." };
    }

    const stat = fs.statSync(resolved.filePath);
    if (!stat.isFile()) {
      return { success: false, error: "Vault path is not a file." };
    }

    const mimeType = mimeTypeForPath(resolved.filePath);
    const buffer = fs.readFileSync(resolved.filePath);
    return {
      success: true,
      path: resolved.normalized,
      data: `data:${mimeType};base64,${buffer.toString("base64")}`,
      mimeType,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function writeVaultFile(
  relativePath: string,
  data: string,
): { success: boolean; path?: string; size?: number; error?: string } {
  try {
    ensureDataDirectories();
    const resolved = getVaultFileAbsolutePath(relativePath);
    if (!resolved) {
      return { success: false, error: "Invalid vault file path." };
    }

    const match = /^data:[^;]+;base64,(.*)$/s.exec(data);
    if (!match) {
      return { success: false, error: "Vault file data must be a base64 data URL." };
    }

    fs.mkdirSync(path.dirname(resolved.filePath), { recursive: true });
    fs.writeFileSync(resolved.filePath, match[1], "base64");
    const size = fs.statSync(resolved.filePath).size;
    return { success: true, path: resolved.normalized, size };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Trash functions
const TRASH_RETENTION_DAYS = 60;

function itemMediaPaths(item: StoredItem): string[] {
  if (item.type === "image" && item.imageUrls && item.imageUrls.length > 0) {
    return item.imageUrls;
  }

  return item.imageUrl ? [item.imageUrl] : [];
}

function moveMediaPath(
  relativePath: string,
  fromDirectory: string,
  toDirectory: string,
): void {
  const filename = relativePath.split(/[\\/]/).pop();
  if (!filename) return;

  const srcPath = path.join(fromDirectory, filename);
  const destPath = path.join(toDirectory, filename);
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
  }
}

function deleteMediaPath(relativePath: string, directory: string): void {
  const filename = relativePath.split(/[\\/]/).pop();
  if (!filename) return;

  const filePath = path.join(directory, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

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

  for (const mediaPath of itemMediaPaths(item)) {
    if (item.type === "audio") {
      moveMediaPath(mediaPath, getAudiosPath(), getTrashAudiosPath());
    } else {
      moveMediaPath(mediaPath, getImagesPath(), getTrashImagesPath());
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

  for (const mediaPath of itemMediaPaths(trashedItem.item)) {
    if (trashedItem.item.type === "audio") {
      moveMediaPath(mediaPath, getTrashAudiosPath(), getAudiosPath());
    } else {
      moveMediaPath(mediaPath, getTrashImagesPath(), getImagesPath());
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

  for (const mediaPath of itemMediaPaths(trashedItem.item)) {
    if (trashedItem.item.type === "audio") {
      deleteMediaPath(mediaPath, getTrashAudiosPath());
    } else {
      deleteMediaPath(mediaPath, getTrashImagesPath());
    }
  }

  trash.splice(index, 1);
  saveTrash(trash);
}

export function emptyTrash(): void {
  const trash = loadTrash();

  for (const trashedItem of trash) {
    for (const mediaPath of itemMediaPaths(trashedItem.item)) {
      if (trashedItem.item.type === "audio") {
        deleteMediaPath(mediaPath, getTrashAudiosPath());
      } else {
        deleteMediaPath(mediaPath, getTrashImagesPath());
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
      for (const mediaPath of itemMediaPaths(trashedItem.item)) {
        if (trashedItem.item.type === "audio") {
          deleteMediaPath(mediaPath, getTrashAudiosPath());
        } else {
          deleteMediaPath(mediaPath, getTrashImagesPath());
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

    // Delete all metadata images
    const metadataPath = getMetadataPath();
    if (fs.existsSync(metadataPath)) {
      const files = fs.readdirSync(metadataPath);
      for (const file of files) {
        fs.unlinkSync(path.join(metadataPath, file));
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
