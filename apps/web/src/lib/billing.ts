"use client";

import { getActiveSession } from "@/lib/auth";
import {
  getSupabaseHeaders,
  readSupabaseError,
  supabaseConfig,
} from "@/lib/supabase";
import { safeExternalHref } from "@/lib/urls";

export interface SyncEntitlement {
  plan?: BillingPlanId | string | null;
  status: string;
  active_until?: string | null;
  provider_price_id?: string | null;
  provider_subscription_id?: string | null;
}

export interface SupporterEntitlement {
  status: string;
  active_until?: string | null;
  provider_price_id?: string | null;
  provider_subscription_id?: string | null;
}

export interface BillingEntitlements {
  sync: SyncEntitlement | null;
  supporter: SupporterEntitlement | null;
}

export type BillingPlanId = "sync_monthly" | "sync_yearly" | "supporter";

const ACTIVE_ENTITLEMENT_STATUSES = new Set(["active", "trialing"]);
export const VAULTY_BILLING_CHANGED_EVENT =
  "vaulty:billing-entitlements-changed";

export function notifyBillingEntitlementsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VAULTY_BILLING_CHANGED_EVENT));
}

function edgeFunctionUrl(name: string): string {
  return `${supabaseConfig.url}/functions/v1/${name}`;
}

export function isBillingEntitlementActive(
  entitlement?: { status?: string | null; active_until?: string | null } | null,
): boolean {
  if (!entitlement?.status) return false;
  if (!ACTIVE_ENTITLEMENT_STATUSES.has(entitlement.status)) return false;
  if (!entitlement.active_until) return true;

  const activeUntil = Date.parse(entitlement.active_until);
  return !Number.isNaN(activeUntil) && activeUntil > Date.now();
}

export function hasBillingSyncAccess(entitlements: BillingEntitlements): boolean {
  return (
    isBillingEntitlementActive(entitlements.sync) ||
    isBillingEntitlementActive(entitlements.supporter)
  );
}

async function invokeBillingFunction(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<string> {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const session = await getActiveSession();
  if (!session) {
    throw new Error("Sign in before opening billing.");
  }

  const response = await fetch(edgeFunctionUrl(name), {
    method: "POST",
    headers: getSupabaseHeaders(session.accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readSupabaseError(response));
  }

  const body = (await response.json()) as { url?: string };
  if (!body.url) {
    throw new Error("Billing did not return a checkout URL.");
  }

  return body.url;
}

function openExternalUrl(url: string): void {
  const safeUrl = safeExternalHref(url);
  if (!safeUrl) {
    throw new Error("Billing returned an invalid URL.");
  }

  window.open(safeUrl, "_blank", "noopener,noreferrer");
}

export async function getSyncEntitlement(): Promise<SyncEntitlement | null> {
  if (!supabaseConfig.isConfigured) return null;

  const session = await getActiveSession();
  if (!session) return null;

  const search = new URLSearchParams({
    select: "plan,status,active_until,provider_price_id,provider_subscription_id",
    user_id: `eq.${session.user.id}`,
    limit: "1",
  });

  const response = await fetch(
    `${supabaseConfig.url}/rest/v1/sync_entitlements?${search.toString()}`,
    {
      method: "GET",
      headers: getSupabaseHeaders(session.accessToken),
    },
  );

  if (!response.ok) {
    throw new Error(await readSupabaseError(response));
  }

  const rows = (await response.json()) as SyncEntitlement[];
  return rows[0] ?? null;
}

export async function getSupporterEntitlement(): Promise<SupporterEntitlement | null> {
  if (!supabaseConfig.isConfigured) return null;

  const session = await getActiveSession();
  if (!session) return null;

  const search = new URLSearchParams({
    select: "status,active_until,provider_price_id,provider_subscription_id",
    user_id: `eq.${session.user.id}`,
    limit: "1",
  });

  const response = await fetch(
    `${supabaseConfig.url}/rest/v1/supporter_entitlements?${search.toString()}`,
    {
      method: "GET",
      headers: getSupabaseHeaders(session.accessToken),
    },
  );

  if (!response.ok) {
    throw new Error(await readSupabaseError(response));
  }

  const rows = (await response.json()) as SupporterEntitlement[];
  return rows[0] ?? null;
}

export async function getBillingEntitlements(): Promise<BillingEntitlements> {
  const [sync, supporter] = await Promise.all([
    getSyncEntitlement(),
    getSupporterEntitlement(),
  ]);

  return { sync, supporter };
}

export async function openCheckout(plan: BillingPlanId): Promise<void> {
  const url = await invokeBillingFunction("create-checkout-session", { plan });
  openExternalUrl(url);
}

export async function openCustomerPortal(): Promise<void> {
  const url = await invokeBillingFunction("customer-portal");
  openExternalUrl(url);
}
