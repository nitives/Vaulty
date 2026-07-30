"use client";

export type PersistedSyncCollection = "items" | "folders" | "pages" | "settings";

export interface PendingSyncDeletion {
  collection: PersistedSyncCollection;
  recordId: string;
  deletedAt: string;
}

interface PendingDeletionState {
  [ownerId: string]: Partial<
    Record<PersistedSyncCollection, Record<string, string>>
  >;
}

const SYNC_ACCOUNT_STORAGE_KEY = "vaulty-sync-account-id";
const PENDING_DELETIONS_STORAGE_KEY = "vaulty-sync-pending-deletions-v1";
const UNBOUND_OWNER_ID = "__unbound__";

export const VAULTY_SYNC_ACCOUNT_CHANGED_EVENT =
  "vaulty:sync-account-changed";

function emitSyncAccountChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VAULTY_SYNC_ACCOUNT_CHANGED_EVENT));
}

function readPendingDeletionState(): PendingDeletionState {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(PENDING_DELETIONS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as PendingDeletionState)
      : {};
  } catch {
    return {};
  }
}

function writePendingDeletionState(state: PendingDeletionState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PENDING_DELETIONS_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Local persistence is best-effort. The local vault remains authoritative.
  }
}

function ownerIdForLocalChanges(): string {
  return getBoundSyncAccountId() ?? UNBOUND_OWNER_ID;
}

function migrateUnboundDeletions(userId: string): void {
  const state = readPendingDeletionState();
  const unbound = state[UNBOUND_OWNER_ID];
  if (!unbound) return;

  const current = state[userId] ?? {};
  for (const collection of Object.keys(unbound) as PersistedSyncCollection[]) {
    current[collection] = {
      ...(unbound[collection] ?? {}),
      ...(current[collection] ?? {}),
    };
  }

  state[userId] = current;
  delete state[UNBOUND_OWNER_ID];
  writePendingDeletionState(state);
}

export class SyncAccountMismatchError extends Error {
  constructor(
    public readonly boundUserId: string,
    public readonly requestedUserId: string,
  ) {
    super(
      "This local vault is linked to a different Vaulty account. Sync is paused to prevent data from being mixed between accounts.",
    );
    this.name = "SyncAccountMismatchError";
  }
}

export function getBoundSyncAccountId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(SYNC_ACCOUNT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function isSyncAccountCompatible(userId: string): boolean {
  const boundUserId = getBoundSyncAccountId();
  return !boundUserId || boundUserId === userId;
}

export function requireCompatibleSyncAccount(userId: string): void {
  const boundUserId = getBoundSyncAccountId();
  if (boundUserId && boundUserId !== userId) {
    throw new SyncAccountMismatchError(boundUserId, userId);
  }

  if (!boundUserId) {
    bindSyncAccount(userId);
  }
}

export function bindSyncAccount(userId: string): void {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.setItem(SYNC_ACCOUNT_STORAGE_KEY, userId);
  } catch {
    return;
  }

  migrateUnboundDeletions(userId);
  emitSyncAccountChanged();
}

export function recordPendingDeletion(
  collection: PersistedSyncCollection,
  recordId: string,
  deletedAt = new Date().toISOString(),
): PendingSyncDeletion {
  const deletion = { collection, recordId, deletedAt };
  if (typeof window === "undefined" || !recordId) return deletion;

  const state = readPendingDeletionState();
  const ownerId = ownerIdForLocalChanges();
  const owner = state[ownerId] ?? {};
  const records = owner[collection] ?? {};
  records[recordId] = deletedAt;
  owner[collection] = records;
  state[ownerId] = owner;
  writePendingDeletionState(state);
  return deletion;
}

export function getPendingDeletions(userId: string): PendingSyncDeletion[] {
  const state = readPendingDeletionState();
  const owner = state[userId];
  if (!owner) return [];

  const deletions: PendingSyncDeletion[] = [];
  for (const collection of Object.keys(owner) as PersistedSyncCollection[]) {
    for (const [recordId, deletedAt] of Object.entries(
      owner[collection] ?? {},
    )) {
      if (recordId && typeof deletedAt === "string") {
        deletions.push({ collection, recordId, deletedAt });
      }
    }
  }

  return deletions;
}

export function clearPendingDeletions(
  userId: string,
  deletions: PendingSyncDeletion[],
): void {
  if (deletions.length === 0) return;

  const state = readPendingDeletionState();
  const owner = state[userId];
  if (!owner) return;

  for (const deletion of deletions) {
    const records = owner[deletion.collection];
    if (records?.[deletion.recordId] === deletion.deletedAt) {
      delete records[deletion.recordId];
    }
    if (records && Object.keys(records).length === 0) {
      delete owner[deletion.collection];
    }
  }

  if (Object.keys(owner).length === 0) {
    delete state[userId];
  } else {
    state[userId] = owner;
  }
  writePendingDeletionState(state);
}
