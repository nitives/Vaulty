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
