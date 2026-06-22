"use client";

import { getActiveSession } from "@/lib/auth";
import { getElectronAPI } from "@/lib/electron";
import {
  createAuthedSupabaseBrowserClient,
  VAULT_ASSETS_BUCKET,
} from "@/lib/supabase";

const VAULT_ASSET_PREFIXES = ["images/", "metadata/", "audios/"];
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_CACHE_MS = 55 * 60 * 1000;

const signedMediaUrlCache = new Map<
  string,
  {
    url: string;
    expiresAt: number;
  }
>();

function isAlreadyLoadableUrl(value: string): boolean {
  return (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    /^https?:\/\//i.test(value)
  );
}

function guessAssetFolder(filename: string): "images" | "metadata" | "audios" {
  if (/\.(mp3|m4a|aac|wav|ogg|oga|flac|opus)$/i.test(filename)) {
    return "audios";
  }
  if (/^link_.*_og\./i.test(filename)) {
    return "metadata";
  }
  return "images";
}

export function getVaultAssetRelativePath(value: string): string | null {
  if (!value) return null;

  const withoutScheme = value.startsWith("vaulty-image://")
    ? value.slice("vaulty-image://".length)
    : value;
  const normalized = withoutScheme.trim().replace(/\\/g, "/");

  if (!normalized || isAlreadyLoadableUrl(normalized)) {
    return null;
  }

  const relative = normalized.replace(/^\/+/, "");
  if (
    VAULT_ASSET_PREFIXES.some((prefix) => relative.startsWith(prefix)) &&
    !relative.includes("..")
  ) {
    return relative;
  }

  for (const dir of VAULT_ASSET_PREFIXES.map((prefix) => `/${prefix}`)) {
    const idx = normalized.lastIndexOf(dir);
    if (idx !== -1) {
      const extracted = normalized.slice(idx + 1);
      return extracted.includes("..") ? null : extracted;
    }
  }

  const filename = normalized.split("/").pop();
  if (!filename || filename.includes("..")) {
    return null;
  }

  return `${guessAssetFolder(filename)}/${filename}`;
}

/** Convert a stored media path to a URL the renderer can load immediately. */
export function getImageUrl(imageUrl: string): string {
  if (!imageUrl) {
    return "";
  }

  if (isAlreadyLoadableUrl(imageUrl)) {
    return imageUrl;
  }

  if (imageUrl.startsWith("vaulty-image://")) {
    return imageUrl;
  }

  const relativePath = getVaultAssetRelativePath(imageUrl);
  if (relativePath) {
    return `vaulty-image://${relativePath}`;
  }

  const filename = imageUrl.split(/[\\/]/).pop() || imageUrl;
  return `vaulty-image://${guessAssetFolder(filename)}/${filename}`;
}

export function getInitialMediaUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  if (getElectronAPI()) return getImageUrl(imageUrl);
  if (isAlreadyLoadableUrl(imageUrl)) return imageUrl;
  return "";
}

export async function resolveMediaUrl(
  imageUrl: string | null | undefined,
): Promise<string> {
  if (!imageUrl) return "";
  if (getElectronAPI()) return getImageUrl(imageUrl);
  if (isAlreadyLoadableUrl(imageUrl)) return imageUrl;

  const relativePath = getVaultAssetRelativePath(imageUrl);
  if (!relativePath) return "";

  const session = await getActiveSession();
  if (!session) return "";

  const objectPath = `${session.user.id}/${relativePath}`;
  const cached = signedMediaUrlCache.get(objectPath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const client = await createAuthedSupabaseBrowserClient(session);
  const { data, error } = await client.storage
    .from(VAULT_ASSETS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return "";
  }

  signedMediaUrlCache.set(objectPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_CACHE_MS,
  });

  return data.signedUrl;
}
