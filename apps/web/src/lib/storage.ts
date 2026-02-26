import { Item } from "@/components";
import { getElectronAPI } from "@/lib/electron";

// Stored item type (dates serialized as ISO strings)
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
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
  };
  pageId?: string;
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
  id: string;
  pulseId: string;
  title: string;
  content: string;
  url?: string;
  isSeen: boolean;
  createdAt: string;
  expiresAt?: string;
  anchorValue?: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Page {
  id: string;
  folderId: string | null;
  name: string;
  createdAt: Date;
}

export interface Pulse {
  id: string;
  name: string;
  heartbeat: string;
  lastChecked: Date | null;
  lastAnchorValue: string | null;
  enabled: boolean;
  addedAt: Date;
  filePath?: string;
}

export interface PulseItem {
  id: string;
  pulseId: string;
  title: string;
  content: string;
  url?: string;
  isSeen: boolean;
  createdAt: Date;
  expiresAt?: Date;
  anchorValue?: string;
}

// Convert Item to StoredItem (serialize dates)
export function itemToStored(item: Item): StoredItem {
  return {
    id: item.id,
    type: item.type,
    content: item.content,
    tags: item.tags,
    createdAt: item.createdAt.toISOString(),
    reminder: item.reminder?.toISOString(),
    imageUrl: item.imageUrl,
    size: item.size,
    analyzed: item.analyzed,
    metadata: item.metadata,
    pageId: item.pageId,
  };
}

// Convert StoredItem to Item (deserialize dates)
export function storedToItem(stored: StoredItem): Item {
  return {
    id: stored.id,
    type: stored.type,
    content: stored.content,
    tags: stored.tags,
    createdAt: new Date(stored.createdAt),
    reminder: stored.reminder ? new Date(stored.reminder) : undefined,
    imageUrl: stored.imageUrl,
    size: stored.size,
    analyzed: stored.analyzed,
    metadata: stored.metadata,
    pageId: stored.pageId,
  };
}

export function folderToStored(folder: Folder): StoredFolder {
  return { ...folder, createdAt: folder.createdAt.toISOString() };
}

export function storedToFolder(stored: StoredFolder): Folder {
  return { ...stored, createdAt: new Date(stored.createdAt) };
}

export function pageToStored(page: Page): StoredPage {
  return { ...page, createdAt: page.createdAt.toISOString() };
}

export function storedToPage(stored: StoredPage): Page {
  return { ...stored, createdAt: new Date(stored.createdAt) };
}

export function storedToPulse(stored: StoredPulse): Pulse {
  return {
    ...stored,
    lastChecked: stored.lastChecked ? new Date(stored.lastChecked) : null,
    addedAt: new Date(stored.addedAt),
  };
}

export function storedToPulseItem(stored: StoredPulseItem): PulseItem {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    expiresAt: stored.expiresAt ? new Date(stored.expiresAt) : undefined,
  };
}

// Load all items from storage
export async function loadItems(): Promise<Item[]> {
  const api = getElectronAPI();
  if (!api) {
    // Fallback: load from localStorage in browser
    try {
      const data = localStorage.getItem("vaulty-items");
      if (data) {
        const stored: StoredItem[] = JSON.parse(data);
        return stored.map(storedToItem);
      }
    } catch (err) {
      console.error("Failed to load from localStorage:", err);
    }
    return [];
  }

  try {
    const stored = await api.loadItems();
    return stored.map(storedToItem);
  } catch (err) {
    console.error("Failed to load items:", err);
    return [];
  }
}

// Save all items to storage
export async function saveItems(items: Item[]): Promise<void> {
  const stored = items.map(itemToStored);
  const api = getElectronAPI();

  if (!api) {
    // Fallback: save to localStorage in browser
    try {
      localStorage.setItem("vaulty-items", JSON.stringify(stored));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
    return;
  }

  try {
    await api.saveItems(stored);
  } catch (err) {
    console.error("Failed to save items:", err);
  }
}

// Add a single item
export async function addItem(item: Item): Promise<void> {
  const stored = itemToStored(item);
  const api = getElectronAPI();

  if (!api) {
    const items = await loadItems();
    items.unshift(item);
    await saveItems(items);
    return;
  }

  try {
    await api.addItem(stored);
  } catch (err) {
    console.error("Failed to add item:", err);
  }
}

// Delete a single item
export async function deleteItem(id: string): Promise<void> {
  const api = getElectronAPI();

  if (!api) {
    const items = await loadItems();
    const filtered = items.filter((item) => item.id !== id);
    await saveItems(filtered);
    return;
  }

  try {
    await api.deleteItem(id);
  } catch (err) {
    console.error("Failed to delete item:", err);
  }
}

// Update a single item
export async function updateItem(item: Item): Promise<void> {
  const stored = itemToStored(item);
  const api = getElectronAPI();

  if (!api) {
    const items = await loadItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      items[index] = item;
      await saveItems(items);
    }
    return;
  }

  try {
    await api.updateItem(stored);
  } catch (err) {
    console.error("Failed to update item:", err);
  }
}

// Folders
export async function loadFolders(): Promise<Folder[]> {
  const api = getElectronAPI();
  if (!api) return [];
  try {
    const stored = await api.loadFolders();
    return stored.map(storedToFolder);
  } catch (err) {
    console.error("Failed to load folders:", err);
    return [];
  }
}

export async function saveFolders(folders: Folder[]): Promise<void> {
  const api = getElectronAPI();
  if (!api) return;
  try {
    await api.saveFolders(folders.map(folderToStored));
  } catch (err) {
    console.error("Failed to save folders:", err);
  }
}

// Pages
export async function loadPages(): Promise<Page[]> {
  const api = getElectronAPI();
  if (!api) return [];
  try {
    const stored = await api.loadPages();
    return stored.map(storedToPage);
  } catch (err) {
    console.error("Failed to load pages:", err);
    return [];
  }
}

export async function savePages(pages: Page[]): Promise<void> {
  const api = getElectronAPI();
  if (!api) return;
  try {
    await api.savePages(pages.map(pageToStored));
  } catch (err) {
    console.error("Failed to save pages:", err);
  }
}

// Save an image and return the path and size
export async function saveImage(
  imageData: string,
  filename: string,
): Promise<{ path: string; size: number } | null> {
  const api = getElectronAPI();

  if (!api) {
    // In browser, just return the data URL (size isn't accurate for data urls in this context, but we fallback gracefully)
    // calculating size of base64 snippet:
    const size = Buffer.from(
      imageData.replace(/^data:[^;]+;base64,/, ""),
      "base64",
    ).length;
    return { path: imageData, size };
  }

  try {
    const result = await api.saveImage(imageData, filename);
    if (result.success && result.path) {
      return { path: result.path, size: result.size || 0 };
    }
    console.error("Failed to save image:", result.error);
    return null;
  } catch (err) {
    console.error("Failed to save image:", err);
    return null;
  }
}

// Pulses
export async function loadPulses(): Promise<Pulse[]> {
  const api = getElectronAPI();
  if (!api || typeof api.loadPulses !== "function") {
    return [];
  }

  try {
    const stored = (await api.loadPulses()) as StoredPulse[];
    return stored.map(storedToPulse);
  } catch (err) {
    console.error("Failed to load pulses:", err);
    return [];
  }
}

export async function loadPulseItems(): Promise<PulseItem[]> {
  const api = getElectronAPI();
  if (!api || typeof api.loadPulseItems !== "function") {
    return [];
  }

  try {
    const stored = (await api.loadPulseItems()) as StoredPulseItem[];
    return stored.map(storedToPulseItem);
  } catch (err) {
    console.error("Failed to load pulse items:", err);
    return [];
  }
}

export async function markPulseItemSeen(
  id: string,
): Promise<{ success: boolean }> {
  const api = getElectronAPI();
  if (!api || typeof api.markPulseItemSeen !== "function") {
    return { success: false };
  }

  try {
    const result = await api.markPulseItemSeen(id);
    return { success: !!result?.success };
  } catch (err) {
    console.error("Failed to mark pulse item as seen:", err);
    return { success: false };
  }
}

export function onNewPulseItem(
  callback: (item: PulseItem) => void,
): () => void {
  const api = getElectronAPI();
  if (!api || typeof api.onNewPulseItem !== "function") {
    return () => {};
  }

  return api.onNewPulseItem((storedItem: StoredPulseItem) => {
    callback(storedToPulseItem(storedItem));
  });
}

// Save an audio file and return the path and size
export async function saveAudio(
  audioData: string,
  filename: string,
): Promise<{ path: string; size: number } | null> {
  const api = getElectronAPI();

  if (!api) {
    const size = Buffer.from(
      audioData.replace(/^data:[^;]+;base64,/, ""),
      "base64",
    ).length;
    return { path: audioData, size };
  }

  try {
    const result = await api.saveAudio(audioData, filename);
    if (result.success && result.path) {
      return { path: result.path, size: result.size || 0 };
    }
    console.error("Failed to save audio:", result.error);
    return null;
  } catch (err) {
    console.error("Failed to save audio:", err);
    return null;
  }
}

// Get the storage path
export async function getStoragePath(): Promise<string | null> {
  const api = getElectronAPI();

  if (!api) {
    return null;
  }

  try {
    return await api.getStoragePath();
  } catch (err) {
    console.error("Failed to get storage path:", err);
    return null;
  }
}
