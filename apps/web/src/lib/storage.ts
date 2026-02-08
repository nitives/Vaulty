import { Item } from "@/components";

// Stored item type (dates serialized as ISO strings)
export interface StoredItem {
  id: string;
  type: "note" | "image" | "link" | "reminder";
  content: string;
  tags: string[];
  createdAt: string;
  reminder?: string;
  imageUrl?: string;
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
  };
}

// Get Electron API if available (type-safe narrowing)
function getElectronAPI() {
  if (typeof window !== "undefined" && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
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

// Save an image and return the file path
export async function saveImage(
  imageData: string,
  filename: string,
): Promise<string | null> {
  const api = getElectronAPI();

  if (!api) {
    // In browser, just return the data URL
    return imageData;
  }

  try {
    const result = await api.saveImage(imageData, filename);
    if (result.success && result.path) {
      return result.path;
    }
    console.error("Failed to save image:", result.error);
    return null;
  } catch (err) {
    console.error("Failed to save image:", err);
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
