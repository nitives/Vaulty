import fs from "fs";
import path from "path";
import {
  getVaultyDataPath,
  getItemsFilePath,
  getImagesPath,
  getTrashPath,
  getTrashFilePath,
  getTrashImagesPath,
} from "./paths";

export interface StoredItem {
  id: string;
  type: "note" | "image" | "link" | "reminder";
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

export interface TrashedItem {
  item: StoredItem;
  deletedAt: string; // ISO date string
}

// Ensure data directories exist
export function ensureDataDirectories(): void {
  const dataPath = getVaultyDataPath();
  const imagesPath = getImagesPath();
  const trashPath = getTrashPath();
  const trashImagesPath = getTrashImagesPath();

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  if (!fs.existsSync(trashPath)) {
    fs.mkdirSync(trashPath, { recursive: true });
  }
  if (!fs.existsSync(trashImagesPath)) {
    fs.mkdirSync(trashImagesPath, { recursive: true });
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

    return { success: true, path: filePath, size };
  } catch (err) {
    console.error("Failed to save image:", err);
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

  // Move image to trash folder if exists
  if (item.imageUrl) {
    const filename = item.imageUrl.split(/[\\/]/).pop();
    if (filename) {
      const srcPath = path.join(getImagesPath(), filename);
      const destPath = path.join(getTrashImagesPath(), filename);
      if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
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

  // Move image back from trash folder if exists
  if (trashedItem.item.imageUrl) {
    const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
    if (filename) {
      const srcPath = path.join(getTrashImagesPath(), filename);
      const destPath = path.join(getImagesPath(), filename);
      if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
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

  // Delete image file if exists
  if (trashedItem.item.imageUrl) {
    const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
    if (filename) {
      const filePath = path.join(getTrashImagesPath(), filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  trash.splice(index, 1);
  saveTrash(trash);
}

export function emptyTrash(): void {
  const trash = loadTrash();

  // Delete all images in trash
  for (const trashedItem of trash) {
    if (trashedItem.item.imageUrl) {
      const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
      if (filename) {
        const filePath = path.join(getTrashImagesPath(), filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
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
      // Delete image file if exists
      if (trashedItem.item.imageUrl) {
        const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
          const filePath = path.join(getTrashImagesPath(), filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
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
