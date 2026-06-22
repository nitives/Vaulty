"use client";

import { getActiveSession, type AuthSession } from "@/lib/auth";
import { getBillingEntitlements, hasBillingSyncAccess } from "@/lib/billing";
import { getElectronAPI } from "@/lib/electron";
import {
  createAuthedSupabaseBrowserClient,
  getSupabaseHeaders,
  readSupabaseError,
  supabaseConfig,
  VAULT_ASSETS_BUCKET,
} from "@/lib/supabase";

export type SyncCollection = "items" | "folders" | "pages" | "settings";

export interface SyncRecordBase {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SyncableRecord = SyncRecordBase & Record<string, unknown>;

export interface SyncSnapshot {
  items: SyncRecordBase[];
  folders: SyncRecordBase[];
  pages: SyncRecordBase[];
  settings?: SyncRecordBase[];
}

export interface VaultRecordRow {
  collection: SyncCollection;
  record_id: string;
  payload: Record<string, unknown> | null;
  updated_at: string;
  deleted_at: string | null;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  mediaErrors?: string[];
  pushed: number;
  pulled: number;
  deleted: number;
  snapshot: SyncSnapshot;
}

interface VaultFileResult {
  success: boolean;
  exists?: boolean;
  path?: string;
  data?: string;
  mimeType?: string;
  size?: number;
  updatedAt?: string;
  error?: string;
}

interface VaultFileApi {
  vaultFileExists?: (relativePath: string) => Promise<VaultFileResult>;
  readVaultFile?: (relativePath: string) => Promise<VaultFileResult>;
  writeVaultFile?: (
    relativePath: string,
    data: string,
  ) => Promise<VaultFileResult>;
}

const SYNCABLE_ASSET_PREFIXES = ["images/", "audios/", "metadata/"];

function describeSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("vault_records") && lower.includes("schema cache")) {
    return "Vaulty sync tables are missing. Run supabase/vaulty_sync.sql in your Supabase SQL editor, then try Sync now again.";
  }

  if (lower.includes("vault_records_collection_check")) {
    return "Vaulty sync needs the updated schema for settings sync. Run the latest supabase/vaulty_sync.sql in your Supabase SQL editor, then try Sync now again.";
  }

  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("violates row-level security")
  ) {
    return "Sync requires an active Vaulty Sync plan or Supporter role. Subscribe in Settings > Sync, then try again.";
  }

  return message;
}

function isVaultAssetPath(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const normalized = value.trim().replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("://") ||
    normalized.includes("..")
  ) {
    return false;
  }

  return SYNCABLE_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function normalizeAssetPath(value: string): string {
  return value.trim().replace(/\\/g, "/");
}

function getRecordAssetPaths(record: unknown): string[] {
  const paths = new Set<string>();
  const data =
    record && typeof record === "object"
      ? (record as Record<string, unknown>)
      : {};

  if (isVaultAssetPath(data.imageUrl)) {
    paths.add(normalizeAssetPath(data.imageUrl));
  }

  if (Array.isArray(data.imageUrls)) {
    for (const imageUrl of data.imageUrls) {
      if (isVaultAssetPath(imageUrl)) {
        paths.add(normalizeAssetPath(imageUrl));
      }
    }
  }

  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : null;

  if (metadata && isVaultAssetPath(metadata.image)) {
    paths.add(normalizeAssetPath(metadata.image));
  }

  return [...paths];
}

function getAssetPaths(records: unknown[]): string[] {
  return [...new Set(records.flatMap(getRecordAssetPaths))];
}

function objectPathForAsset(userId: string, relativePath: string): string {
  return `${userId}/${relativePath}`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function uploadVaultAsset(
  session: AuthSession,
  api: VaultFileApi,
  relativePath: string,
): Promise<void> {
  if (!api.readVaultFile) return;

  const file = await api.readVaultFile(relativePath);
  if (!file.success || !file.data) {
    throw new Error(file.error ?? `Could not read ${relativePath}.`);
  }

  const client = await createAuthedSupabaseBrowserClient(session);
  const blob = await dataUrlToBlob(file.data);
  const { error } = await client.storage
    .from(VAULT_ASSETS_BUCKET)
    .upload(objectPathForAsset(session.user.id, relativePath), blob, {
      contentType: file.mimeType || blob.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

async function downloadVaultAsset(
  session: AuthSession,
  api: VaultFileApi,
  relativePath: string,
): Promise<void> {
  if (!api.writeVaultFile) return;

  const client = await createAuthedSupabaseBrowserClient(session);
  const { data, error } = await client.storage
    .from(VAULT_ASSETS_BUCKET)
    .download(objectPathForAsset(session.user.id, relativePath));

  if (error) {
    throw new Error(error.message);
  }

  const dataUrl = await blobToDataUrl(data);
  const result = await api.writeVaultFile(relativePath, dataUrl);
  if (!result.success) {
    throw new Error(result.error ?? `Could not write ${relativePath}.`);
  }
}

export async function pushAssetsForItems(
  records: unknown[],
): Promise<string[]> {
  const session = await getSyncSession();
  const api = getElectronAPI() as VaultFileApi | null;
  if (!session || !api?.readVaultFile) return [];

  const errors: string[] = [];
  for (const relativePath of getAssetPaths(records)) {
    try {
      await uploadVaultAsset(session, api, relativePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${relativePath}: ${message}`);
    }
  }

  return errors;
}

export async function syncAssetsForItems(
  records: unknown[],
): Promise<string[]> {
  const session = await getSyncSession();
  const api = getElectronAPI() as VaultFileApi | null;
  if (!session || !api?.vaultFileExists) return [];

  const errors: string[] = [];
  for (const relativePath of getAssetPaths(records)) {
    try {
      const local = await api.vaultFileExists(relativePath);
      if (local.success && local.exists) {
        await uploadVaultAsset(session, api, relativePath);
      } else {
        await downloadVaultAsset(session, api, relativePath);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${relativePath}: ${message}`);
    }
  }

  return errors;
}

function vaultRecordsUrl(search?: URLSearchParams): string {
  const query = search ? `?${search.toString()}` : "";
  return `${supabaseConfig.url}/rest/v1/vault_records${query}`;
}

function timestampMs(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function recordUpdatedAt(record: SyncRecordBase): string {
  const fallback = new Date().toISOString();
  const value = record.updatedAt ?? record.createdAt;
  if (!value) return fallback;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

function withUpdatedAt<T extends SyncRecordBase>(
  record: T,
  updatedAt: string,
): T & { updatedAt: string } {
  return {
    ...record,
    updatedAt,
  };
}

async function getSyncSession(): Promise<AuthSession | null> {
  if (!supabaseConfig.isConfigured) return null;
  return getActiveSession();
}

async function upsertVaultRows(
  session: AuthSession,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  if (rows.length === 0) return;

  const search = new URLSearchParams({
    on_conflict: "user_id,collection,record_id",
  });
  const response = await fetch(vaultRecordsUrl(search), {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(session.accessToken),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(await readSupabaseError(response));
  }
}

export async function pushCollectionRecords(
  collection: SyncCollection,
  records: SyncRecordBase[],
): Promise<void> {
  const session = await getSyncSession();
  if (!session || records.length === 0) return;

  const rows = records.map((record) => {
    const updatedAt = recordUpdatedAt(record);
    return {
      user_id: session.user.id,
      collection,
      record_id: record.id,
      payload: withUpdatedAt(record, updatedAt),
      updated_at: updatedAt,
      deleted_at: null,
    };
  });

  await upsertVaultRows(session, rows);
}

export async function pushDeletedRecord(
  collection: SyncCollection,
  recordId: string,
): Promise<void> {
  const session = await getSyncSession();
  if (!session || !recordId) return;

  const deletedAt = new Date().toISOString();
  await upsertVaultRows(session, [
    {
      user_id: session.user.id,
      collection,
      record_id: recordId,
      payload: { id: recordId, updatedAt: deletedAt },
      updated_at: deletedAt,
      deleted_at: deletedAt,
    },
  ]);
}

export async function pushDeletedRecords(
  collection: SyncCollection,
  recordIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(recordIds)].filter(Boolean);
  const session = await getSyncSession();
  if (!session || uniqueIds.length === 0) return;

  const deletedAt = new Date().toISOString();
  await upsertVaultRows(
    session,
    uniqueIds.map((recordId) => ({
      user_id: session.user.id,
      collection,
      record_id: recordId,
      payload: { id: recordId, updatedAt: deletedAt },
      updated_at: deletedAt,
      deleted_at: deletedAt,
    })),
  );
}

async function pullVaultRows(session: AuthSession): Promise<VaultRecordRow[]> {
  const search = new URLSearchParams({
    select: "collection,record_id,payload,updated_at,deleted_at",
    order: "updated_at.asc",
  });
  const response = await fetch(vaultRecordsUrl(search), {
    method: "GET",
    headers: getSupabaseHeaders(session.accessToken),
  });

  if (!response.ok) {
    throw new Error(await readSupabaseError(response));
  }

  return (await response.json()) as VaultRecordRow[];
}

export async function pullVaultRecords(): Promise<VaultRecordRow[]> {
  const session = await getSyncSession();
  if (!session) return [];
  return pullVaultRows(session);
}

export async function subscribeToVaultRecordChanges(
  onChange: () => void,
): Promise<() => void> {
  const session = await getSyncSession();
  if (!session) return () => {};

  const client = await createAuthedSupabaseBrowserClient(session);
  client.realtime.setAuth(session.accessToken);

  const channel = client
    .channel(`vault-records:${session.user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vault_records",
        filter: `user_id=eq.${session.user.id}`,
      },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("Vaulty realtime sync channel failed.");
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}

export function mergeCollectionRecords<T extends SyncRecordBase>(
  collection: SyncCollection,
  localRecords: T[],
  remoteRows: VaultRecordRow[],
): { records: T[]; pulled: number; deleted: number } {
  const merged = new Map<string, T>();

  for (const record of localRecords) {
    merged.set(record.id, record);
  }

  let pulled = 0;
  let deleted = 0;

  for (const row of remoteRows) {
    if (row.collection !== collection) continue;

    const local = merged.get(row.record_id);
    const localUpdatedAt = timestampMs(local?.updatedAt ?? local?.createdAt);
    const remoteUpdatedAt = timestampMs(row.updated_at);

    if (row.deleted_at) {
      if (!local || remoteUpdatedAt >= localUpdatedAt) {
        if (local) deleted += 1;
        merged.delete(row.record_id);
      }
      continue;
    }

    if (!local || remoteUpdatedAt > localUpdatedAt) {
      const payload = row.payload ?? {};
      const payloadId = typeof payload.id === "string" ? payload.id : row.record_id;

      merged.set(
        row.record_id,
        withUpdatedAt(
          {
            ...payload,
            id: payloadId,
          } as T,
          row.updated_at,
        ),
      );
      pulled += 1;
    }
  }

  return { records: [...merged.values()], pulled, deleted };
}

function sortItems<T extends SyncRecordBase>(records: T[]): T[] {
  return [...records].sort(
    (a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt),
  );
}

export async function syncVaultSnapshot(
  snapshot: SyncSnapshot,
): Promise<SyncResult> {
  const emptyResult: SyncResult = {
    success: false,
    pushed: 0,
    pulled: 0,
    deleted: 0,
    snapshot,
  };

  if (!supabaseConfig.isConfigured) {
    return { ...emptyResult, error: "Supabase is not configured." };
  }

  const session = await getActiveSession();
  if (!session) {
    return { ...emptyResult, error: "Sign in before syncing." };
  }

  try {
    const entitlements = await getBillingEntitlements();
    if (!hasBillingSyncAccess(entitlements)) {
      return {
        ...emptyResult,
        error:
          "Sync requires an active Vaulty Sync plan or Supporter role. Subscribe in Settings > Sync, then try again.",
      };
    }

    const remoteRows = await pullVaultRows(session);
    const items = mergeCollectionRecords("items", snapshot.items, remoteRows);
    const folders = mergeCollectionRecords("folders", snapshot.folders, remoteRows);
    const pages = mergeCollectionRecords("pages", snapshot.pages, remoteRows);
    const settings = mergeCollectionRecords(
      "settings",
      snapshot.settings ?? [],
      remoteRows,
    );
    const mergedSnapshot: SyncSnapshot = {
      items: sortItems(items.records),
      folders: folders.records,
      pages: pages.records,
      settings: settings.records,
    };

    await Promise.all([
      pushCollectionRecords("items", mergedSnapshot.items),
      pushCollectionRecords("folders", mergedSnapshot.folders),
      pushCollectionRecords("pages", mergedSnapshot.pages),
      pushCollectionRecords("settings", mergedSnapshot.settings ?? []),
    ]);

    return {
      success: true,
      pushed:
        mergedSnapshot.items.length +
        mergedSnapshot.folders.length +
        mergedSnapshot.pages.length +
        (mergedSnapshot.settings?.length ?? 0),
      pulled: items.pulled + folders.pulled + pages.pulled + settings.pulled,
      deleted:
        items.deleted + folders.deleted + pages.deleted + settings.deleted,
      snapshot: mergedSnapshot,
    };
  } catch (err) {
    return {
      ...emptyResult,
      error: describeSyncError(err),
    };
  }
}
