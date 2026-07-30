import Stripe from "npm:stripe";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
} from "../_shared/supabase-env.ts";

function readAppUrl(): string | null {
  const rawValue = Deno.env.get("APP_URL")?.trim();
  if (!rawValue) return null;

  try {
    const url = new URL(rawValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const appUrl = readAppUrl();

  if (!supabaseUrl || !publishableKey || !secretKey || !stripeSecretKey || !appUrl) {
    return jsonResponse({ error: "Billing is not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse({ error: "Missing authorization." }, 401);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    return jsonResponse({ error: "Invalid session." }, 401);
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
  const { data: entitlement, error: entitlementError } = await adminClient
    .from("sync_entitlements")
    .select("provider_customer_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (entitlementError) {
    return jsonResponse({ error: entitlementError.message }, 500);
  }

  const {
    data: supporterEntitlement,
    error: supporterEntitlementError,
  } = entitlement?.provider_customer_id
    ? { data: null, error: null }
    : await adminClient
        .from("supporter_entitlements")
        .select("provider_customer_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
  if (supporterEntitlementError) {
    return jsonResponse({ error: supporterEntitlementError.message }, 500);
  }

  const customerId =
    entitlement?.provider_customer_id ??
    supporterEntitlement?.provider_customer_id;

  if (!customerId) {
    return jsonResponse({ error: "No Stripe customer found." }, 404);
  }

  const stripe = new Stripe(stripeSecretKey);
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: appUrl,
  });

  return jsonResponse({ url: portalSession.url });
});
