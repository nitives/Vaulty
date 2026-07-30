import { Item } from "@/components";
import { getElectronAPI } from "@/lib/electron";
import type { AppSettings } from "@/lib/settings";
import {
  pushAssetsForItems,
  pushCollectionRecords,
  pushDeletedRecord,
  pushDeletedRecords,
  mergeCollectionRecords,
  pullVaultRecords,
  syncAssetsForItems,
  syncVaultSnapshot,
  type SyncResult,
  type SyncSnapshot,
  type SyncRecordBase,
  type VaultRecordRow,
} from "@/lib/sync";
import {
  getBoundSyncAccountId,
  getPendingDeletions,
  recordPendingDeletion,
  type PersistedSyncCollection,
} from "@/lib/syncAccount";

// Stored item type (dates serialized as ISO strings)
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
  updatedAt?: Date;
  parentFolderId: string | null;
}

export interface Page {
  id: string;
  folderId: string | null;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
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

export const VAULTY_SYNC_COMPLETE_EVENT = "vaulty:sync-complete";
const CUSTOM_CSS_SYNC_RECORD_ID = "custom-css";
const ITEMS_STORAGE_KEY = "vaulty-items";
const FOLDERS_STORAGE_KEY = "vaulty-folders";
const PAGES_STORAGE_KEY = "vaulty-pages";

interface CustomCssSyncRecord extends SyncRecordBase {
  customCSS?: boolean;
  customCSSContent?: string;
  cssPath?: string;
}

function asIso(value: Date | string | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

function withoutUpdatedAt<T extends { updatedAt?: string }>(
  record: T,
): Omit<T, "updatedAt"> {
  const copy = { ...record };
  delete copy.updatedAt;
  return copy;
}

function sameExceptUpdatedAt<T extends { updatedAt?: string }>(
  a: T,
  b?: T,
): boolean {
  if (!b) return false;
  return JSON.stringify(withoutUpdatedAt(a)) === JSON.stringify(withoutUpdatedAt(b));
}

function touchChangedRecords<T extends { id: string; createdAt?: string; updatedAt?: string }>(
  records: T[],
  previousRecords: T[],
): T[] {
  const now = new Date().toISOString();
  const previousById = new Map(previousRecords.map((record) => [record.id, record]));

  return records.map((record) => {
    const previous = previousById.get(record.id);
    if (sameExceptUpdatedAt(record, previous)) {
      return {
        ...record,
        updatedAt: previous?.updatedAt ?? record.updatedAt ?? record.createdAt ?? now,
      };
    }

    return { ...record, updatedAt: now };
  });
}

function removedIds<T extends { id: string }>(previous: T[], next: T[]): string[] {
  const nextIds = new Set(next.map((record) => record.id));
  return previous
    .filter((record) => !nextIds.has(record.id))
    .map((record) => record.id);
}

function queueSync(task: Promise<unknown>): void {
  task.catch((err) => console.error("Vaulty sync failed:", err));
}

function queueDeletedRecords(
  collection: PersistedSyncCollection,
  recordIds: string[],
): void {
  const deletions = [...new Set(recordIds)]
    .filter(Boolean)
    .map((recordId) => recordPendingDeletion(collection, recordId));
  if (deletions.length > 0) {
    queueSync(pushDeletedRecords(collection, deletions));
  }
}

function notifySyncComplete(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VAULTY_SYNC_COMPLETE_EVENT));
}

function readLocalStorageRecords<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch (err) {
    console.error(`Failed to load ${key} from localStorage:`, err);
    return [];
  }
}

function writeLocalStorageRecords<T>(key: string, records: T[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

function dataUrlByteSize(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return dataUrl.length;

  const metadata = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);

  if (metadata.includes(";base64")) {
    const cleanPayload = payload.replace(/\s/g, "");
    const padding = cleanPayload.endsWith("==")
      ? 2
      : cleanPayload.endsWith("=")
        ? 1
        : 0;
    return Math.max(0, Math.floor((cleanPayload.length * 3) / 4) - padding);
  }

  try {
    return new Blob([decodeURIComponent(payload)]).size;
  } catch {
    return payload.length;
  }
}

function sortStoredItems(records: StoredItem[]): StoredItem[] {
  return [...records].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

async function loadAppSettingsForSync(): Promise<AppSettings> {
  const api = getElectronAPI();
  if (api?.getSettings) {
    return api.getSettings();
  }

  try {
    return JSON.parse(
      localStorage.getItem("vaulty-settings") ?? "{}",
    ) as AppSettings;
  } catch {
    return {};
  }
}

async function loadSettingsRecordsForSync(): Promise<CustomCssSyncRecord[]> {
  const settings = await loadAppSettingsForSync();
  return [
    {
      id: CUSTOM_CSS_SYNC_RECORD_ID,
      customCSS: Boolean(settings.customCSS),
      customCSSContent: settings.customCSSContent ?? "",
      cssPath: "custom.css",
      updatedAt: settings.customCSSUpdatedAt ?? new Date().toISOString(),
    },
  ];
}

async function applySettingsRecordsFromSync(
  records: SyncRecordBase[] | undefined,
): Promise<void> {
  const customCssRecord = records?.find(
    (record) => record.id === CUSTOM_CSS_SYNC_RECORD_ID,
  ) as CustomCssSyncRecord | undefined;
  if (!customCssRecord) return;

  const patch: Partial<AppSettings> = {
    customCSS: Boolean(customCssRecord.customCSS),
    customCSSContent:
      typeof customCssRecord.customCSSContent === "string"
        ? customCssRecord.customCSSContent
        : "",
    customCSSUpdatedAt: customCssRecord.updatedAt,
  };

  const api = getElectronAPI();
  if (api?.setSettings) {
    await api.setSettings(patch);
    return;
  }

  const current = await loadAppSettingsForSync();
  localStorage.setItem(
    "vaulty-settings",
    JSON.stringify({ ...current, ...patch }),
  );
}

// Convert Item to StoredItem (serialize dates)
export function itemToStored(item: Item, updatedAt?: string): StoredItem {
  const createdAt = item.createdAt.toISOString();
  return {
    id: item.id,
    type: item.type,
    content: item.content,
    tags: item.tags,
    createdAt,
    updatedAt: updatedAt ?? asIso(item.updatedAt, createdAt),
    reminder: item.reminder?.toISOString(),
    imageUrl: item.imageUrl,
    imageUrls: item.imageUrls,
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
    updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : undefined,
    reminder: stored.reminder ? new Date(stored.reminder) : undefined,
    imageUrl: stored.imageUrl,
    imageUrls: stored.imageUrls,
    size: stored.size,
    analyzed: stored.analyzed,
    metadata: stored.metadata,
    pageId: stored.pageId,
  };
}

export function folderToStored(folder: Folder, updatedAt?: string): StoredFolder {
  const createdAt = folder.createdAt.toISOString();
  return {
    ...folder,
    createdAt,
    updatedAt: updatedAt ?? asIso(folder.updatedAt, createdAt),
    parentFolderId: folder.parentFolderId ?? null,
  };
}

export function storedToFolder(stored: StoredFolder): Folder {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : undefined,
    parentFolderId:
      typeof stored.parentFolderId === "string" && stored.parentFolderId.trim()
        ? stored.parentFolderId
        : null,
  };
}

export function pageToStored(page: Page, updatedAt?: string): StoredPage {
  const createdAt = page.createdAt.toISOString();
  return {
    ...page,
    createdAt,
    updatedAt: updatedAt ?? asIso(page.updatedAt, createdAt),
  };
}

export function storedToPage(stored: StoredPage): Page {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : undefined,
  };
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
    return readLocalStorageRecords<StoredItem>(ITEMS_STORAGE_KEY).map(
      storedToItem,
    );
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
  const stored = items.map((item) => itemToStored(item));
  const api = getElectronAPI();

  if (!api) {
    // Fallback: save to localStorage in browser
    const previous = readLocalStorageRecords<StoredItem>(ITEMS_STORAGE_KEY);
    const prepared = touchChangedRecords(stored, previous);
    const deleted = removedIds(previous, prepared);
    writeLocalStorageRecords(ITEMS_STORAGE_KEY, prepared);
    queueSync(pushCollectionRecords("items", prepared));
    queueSync(pushAssetsForItems(prepared));
    queueDeletedRecords("items", deleted);
    return;
  }

  try {
    const previous = (await api.loadItems()) as StoredItem[];
    const prepared = touchChangedRecords(stored, previous);
    const deleted = removedIds(previous, prepared);
    await api.saveItems(prepared);
    queueSync(pushCollectionRecords("items", prepared));
    queueSync(pushAssetsForItems(prepared));
    queueDeletedRecords("items", deleted);
  } catch (err) {
    console.error("Failed to save items:", err);
  }
}

// Add a single item
export async function addItem(item: Item): Promise<void> {
  const stored = itemToStored(item, new Date().toISOString());
  const api = getElectronAPI();

  if (!api) {
    const previous = readLocalStorageRecords<StoredItem>(ITEMS_STORAGE_KEY);
    const next = [
      stored,
      ...previous.filter((record) => record.id !== item.id),
    ];
    writeLocalStorageRecords(ITEMS_STORAGE_KEY, next);
    queueSync(pushCollectionRecords("items", [stored]));
    queueSync(pushAssetsForItems([stored]));
    return;
  }

  try {
    await api.addItem(stored);
    queueSync(pushCollectionRecords("items", [stored]));
    queueSync(pushAssetsForItems([stored]));
  } catch (err) {
    console.error("Failed to add item:", err);
  }
}

// Delete a single item
export async function deleteItem(id: string): Promise<void> {
  const api = getElectronAPI();

  if (!api) {
    const previous = readLocalStorageRecords<StoredItem>(ITEMS_STORAGE_KEY);
    writeLocalStorageRecords(
      ITEMS_STORAGE_KEY,
      previous.filter((item) => item.id !== id),
    );
    const deletion = recordPendingDeletion("items", id);
    queueSync(pushDeletedRecord("items", id, deletion.deletedAt));
    return;
  }

  try {
    await api.deleteItem(id);
    const deletion = recordPendingDeletion("items", id);
    queueSync(pushDeletedRecord("items", id, deletion.deletedAt));
  } catch (err) {
    console.error("Failed to delete item:", err);
  }
}

// Update a single item
export async function updateItem(item: Item): Promise<void> {
  const stored = itemToStored(item, new Date().toISOString());
  const api = getElectronAPI();

  if (!api) {
    const items = readLocalStorageRecords<StoredItem>(ITEMS_STORAGE_KEY);
    const index = items.findIndex((i) => i.id === stored.id);
    if (index !== -1) {
      items[index] = stored;
      writeLocalStorageRecords(ITEMS_STORAGE_KEY, items);
      queueSync(pushCollectionRecords("items", [stored]));
      queueSync(pushAssetsForItems([stored]));
    }
    return;
  }

  try {
    await api.updateItem(stored);
    queueSync(pushCollectionRecords("items", [stored]));
    queueSync(pushAssetsForItems([stored]));
  } catch (err) {
    console.error("Failed to update item:", err);
  }
}

// Folders
export async function loadFolders(): Promise<Folder[]> {
  const api = getElectronAPI();
  if (!api) {
    return readLocalStorageRecords<StoredFolder>(FOLDERS_STORAGE_KEY).map(
      storedToFolder,
    );
  }
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
  const stored = folders.map((folder) => folderToStored(folder));

  if (!api) {
    const previous = readLocalStorageRecords<StoredFolder>(FOLDERS_STORAGE_KEY);
    const prepared = touchChangedRecords(stored, previous);
    const deleted = removedIds(previous, prepared);
    writeLocalStorageRecords(FOLDERS_STORAGE_KEY, prepared);
    queueSync(pushCollectionRecords("folders", prepared));
    queueDeletedRecords("folders", deleted);
    return;
  }

  try {
    const previous = (await api.loadFolders()) as StoredFolder[];
    const prepared = touchChangedRecords(stored, previous);
    const deleted = removedIds(previous, prepared);
    await api.saveFolders(prepared);
    queueSync(pushCollectionRecords("folders", prepared));
    queueDeletedRecords("folders", deleted);
  } catch (err) {
    console.error("Failed to save folders:", err);
  }
}

// Pages
export async function loadPages(): Promise<Page[]> {
  const api = getElectronAPI();
  if (!api) {
    return readLocalStorageRecords<StoredPage>(PAGES_STORAGE_KEY).map(
      storedToPage,
    );
  }
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
  const stored = pages.map((page) => pageToStored(page));

  if (!api) {
    const previous = readLocalStorageRecords<StoredPage>(PAGES_STORAGE_KEY);
    const prepared = touchChangedRecords(stored, previous);
    const deleted = removedIds(previous, prepared);
    writeLocalStorageRecords(PAGES_STORAGE_KEY, prepared);
    queueSync(pushCollectionRecords("pages", prepared));
    queueDeletedRecords("pages", deleted);
    return;
  }

  try {
    const previous = (await api.loadPages()) as StoredPage[];
    const prepared = touchChangedRecords(stored, previous);
    const deleted = removedIds(previous, prepared);
    await api.savePages(prepared);
    queueSync(pushCollectionRecords("pages", prepared));
    queueDeletedRecords("pages", deleted);
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
    return { path: imageData, size: dataUrlByteSize(imageData) };
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
    return { path: audioData, size: dataUrlByteSize(audioData) };
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

// Save an audio cover image into the audios directory
export async function saveAudioImage(
  imageData: string,
  filename: string,
): Promise<{ path: string; size: number } | null> {
  const api = getElectronAPI();

  if (!api) {
    return { path: imageData, size: dataUrlByteSize(imageData) };
  }

  try {
    const result = await api.saveAudioImage(imageData, filename);
    if (result.success && result.path) {
      return { path: result.path, size: result.size || 0 };
    }
    console.error("Failed to save audio image:", result.error);
    return null;
  } catch (err) {
    console.error("Failed to save audio image:", err);
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

async function loadStoredSnapshot(): Promise<{
  items: StoredItem[];
  folders: StoredFolder[];
  pages: StoredPage[];
  settings: CustomCssSyncRecord[];
}> {
  const api = getElectronAPI();

  if (!api) {
    return {
      items: readLocalStorageRecords<StoredItem>(ITEMS_STORAGE_KEY),
      folders: readLocalStorageRecords<StoredFolder>(FOLDERS_STORAGE_KEY),
      pages: readLocalStorageRecords<StoredPage>(PAGES_STORAGE_KEY),
      settings: await loadSettingsRecordsForSync(),
    };
  }

  const [items, folders, pages, settings] = await Promise.all([
    api.loadItems() as Promise<StoredItem[]>,
    api.loadFolders() as Promise<StoredFolder[]>,
    api.loadPages() as Promise<StoredPage[]>,
    loadSettingsRecordsForSync(),
  ]);

  return { items, folders, pages, settings };
}

async function saveStoredSnapshotWithoutSync(
  snapshot: SyncSnapshot,
): Promise<void> {
  const api = getElectronAPI();
  const items = sortStoredItems(snapshot.items as StoredItem[]);
  const folders = snapshot.folders as StoredFolder[];
  const pages = snapshot.pages as StoredPage[];

  if (api) {
    await Promise.all([
      api.saveItems(items),
      api.saveFolders(folders),
      api.savePages(pages),
      applySettingsRecordsFromSync(snapshot.settings),
    ]);
    return;
  }

  writeLocalStorageRecords(ITEMS_STORAGE_KEY, items);
  writeLocalStorageRecords(FOLDERS_STORAGE_KEY, folders);
  writeLocalStorageRecords(PAGES_STORAGE_KEY, pages);
  await applySettingsRecordsFromSync(snapshot.settings);
}

export async function applyRemoteVaultRecords(
  remoteRows: VaultRecordRow[],
): Promise<SyncResult> {
  const local = await loadStoredSnapshot();
  const items = mergeCollectionRecords("items", local.items, remoteRows);
  const folders = mergeCollectionRecords("folders", local.folders, remoteRows);
  const pages = mergeCollectionRecords("pages", local.pages, remoteRows);
  const settings = mergeCollectionRecords("settings", local.settings, remoteRows);

  const snapshot: SyncSnapshot = {
    items: sortStoredItems(items.records),
    folders: folders.records,
    pages: pages.records,
    settings: settings.records,
  };

  await saveStoredSnapshotWithoutSync(snapshot);
  const mediaErrors = await syncAssetsForItems(snapshot.items);
  notifySyncComplete();

  return {
    success: true,
    pushed: 0,
    pulled: items.pulled + folders.pulled + pages.pulled + settings.pulled,
    deleted: items.deleted + folders.deleted + pages.deleted + settings.deleted,
    snapshot,
    mediaErrors,
  };
}

export async function pullRemoteVaultNow(): Promise<SyncResult> {
  try {
    const boundUserId = getBoundSyncAccountId();
    if (boundUserId && getPendingDeletions(boundUserId).length > 0) {
      return syncVaultNow();
    }

    const remoteRows = await pullVaultRecords();
    return applyRemoteVaultRecords(remoteRows);
  } catch (err) {
    const snapshot = await loadStoredSnapshot();
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      pushed: 0,
      pulled: 0,
      deleted: 0,
      snapshot,
    };
  }
}

export async function initializeLiveVaultSync(): Promise<SyncResult> {
  return syncVaultNow();
}

export async function syncVaultNow(): Promise<SyncResult> {
  const local = await loadStoredSnapshot();

  const result = await syncVaultSnapshot({
    items: local.items,
    folders: local.folders,
    pages: local.pages,
    settings: local.settings,
  });

  if (!result.success) {
    return result;
  }

  await saveStoredSnapshotWithoutSync(result.snapshot);

  const mediaErrors = await syncAssetsForItems(result.snapshot.items);
  notifySyncComplete();
  return { ...result, mediaErrors };
}
