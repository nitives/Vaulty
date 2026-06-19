import Stripe from "npm:stripe";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSupabasePublishableKey } from "../_shared/supabase-env.ts";

type BillingPlanId = "sync_monthly" | "sync_yearly" | "supporter";

function getPlanPriceId(plan: BillingPlanId): string | undefined {
  if (plan === "sync_yearly") {
    return Deno.env.get("STRIPE_SYNC_YEARLY_PRICE_ID") ??
      Deno.env.get("STRIPE_SYNC_ANNUAL_PRICE_ID");
  }

  if (plan === "supporter") {
    return Deno.env.get("STRIPE_SUPPORTER_PRICE_ID");
  }

  return Deno.env.get("STRIPE_SYNC_MONTHLY_PRICE_ID") ??
    Deno.env.get("STRIPE_SYNC_PRICE_ID") ??
    Deno.env.get("STRIPE_PRICE_ID");
}

async function readRequestedPlan(req: Request): Promise<BillingPlanId> {
  try {
    const body = (await req.json()) as { plan?: unknown };
    if (body.plan === "sync_yearly" || body.plan === "supporter") {
      return body.plan;
    }
    return "sync_monthly";
  } catch {
    return "sync_monthly";
  }
}

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
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const plan = await readRequestedPlan(req);
  const priceId = getPlanPriceId(plan);
  const appUrl = readAppUrl();

  if (!supabaseUrl || !publishableKey || !stripeSecretKey || !priceId || !appUrl) {
    return jsonResponse({ error: `${plan} billing is not configured.` }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse({ error: "Missing authorization." }, 401);
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return jsonResponse({ error: "Invalid session." }, 401);
  }

  const stripe = new Stripe(stripeSecretKey);
  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Could not load Stripe price: ${message}` }, 500);
  }

  const mode = price.type === "recurring" ? "subscription" : "payment";
  const metadata = {
    plan,
    product: "vaulty",
    supabase_user_id: data.user.id,
  };

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    client_reference_id: data.user.id,
    customer_email: data.user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?billing=success`,
    cancel_url: `${appUrl}/?billing=cancelled`,
    allow_promotion_codes: true,
    metadata,
  };

  if (mode === "subscription") {
    checkoutParams.subscription_data = { metadata };
  } else {
    checkoutParams.customer_creation = "always";
    checkoutParams.payment_intent_data = { metadata };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(checkoutParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Could not create checkout: ${message}` }, 500);
  }

  return jsonResponse({ url: session.url });
});
