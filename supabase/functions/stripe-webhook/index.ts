import Stripe from "npm:stripe";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-env.ts";

type BillingPlanId = "sync" | "sync_monthly" | "sync_yearly" | "supporter";

function stringId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function activeUntilFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  return subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
}

function subscriptionPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price.id ?? null;
}

function planFromPriceId(priceId: string | null): BillingPlanId {
  const syncYearlyPriceIds = [
    Deno.env.get("STRIPE_SYNC_YEARLY_PRICE_ID"),
    Deno.env.get("STRIPE_SYNC_ANNUAL_PRICE_ID"),
  ];
  const supporterPriceIds = [Deno.env.get("STRIPE_SUPPORTER_PRICE_ID")];

  if (priceId && syncYearlyPriceIds.includes(priceId)) return "sync_yearly";
  if (priceId && supporterPriceIds.includes(priceId)) return "supporter";
  return "sync_monthly";
}

function normalizePlan(value: unknown, priceId: string | null): BillingPlanId {
  if (
    value === "sync" ||
    value === "sync_monthly" ||
    value === "sync_yearly" ||
    value === "supporter"
  ) {
    return value;
  }
  return planFromPriceId(priceId);
}

function isSupporterPlan(plan: BillingPlanId): boolean {
  return plan === "supporter";
}

async function checkoutSessionPriceId(
  stripe: Stripe,
  sessionId: string,
): Promise<string | null> {
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 1,
  });
  return lineItems.data[0]?.price?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSupabaseSecretKey();
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!supabaseUrl || !secretKey || !stripeSecretKey || !webhookSecret) {
    return jsonResponse({ error: "Webhook is not configured." }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature." }, 400);
  }

  const stripe = new Stripe(stripeSecretKey);
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  const payload = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 400);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  async function upsertEntitlement(values: {
    userId: string;
    plan: BillingPlanId;
    customerId: string | null;
    checkoutSessionId?: string | null;
    subscriptionId: string | null;
    priceId: string | null;
    status: string;
    activeUntil: string | null;
  }) {
    const table = isSupporterPlan(values.plan)
      ? "supporter_entitlements"
      : "sync_entitlements";
    const basePayload = {
      user_id: values.userId,
      provider: "stripe",
      provider_customer_id: values.customerId,
      provider_subscription_id: values.subscriptionId,
      provider_price_id: values.priceId,
      status: values.status,
      active_until: values.activeUntil,
      updated_at: new Date().toISOString(),
    };
    const payload = isSupporterPlan(values.plan)
      ? {
          ...basePayload,
          provider_checkout_session_id: values.checkoutSessionId ?? null,
        }
      : {
          ...basePayload,
          plan: values.plan,
        };

    const { error } = await supabase.from(table).upsert(payload);

    if (error) {
      throw new Error(error.message);
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = stringId(session.subscription);
      const customerId = stringId(session.customer);
      const subscription = subscriptionId
        ? await stripe.subscriptions.retrieve(subscriptionId)
        : null;
      const priceId = subscription
        ? subscriptionPriceId(subscription)
        : await checkoutSessionPriceId(stripe, session.id);
      const plan = normalizePlan(
        session.metadata?.plan ?? subscription?.metadata?.plan,
        priceId,
      );
      const userId =
        session.client_reference_id ??
        session.metadata?.supabase_user_id ??
        subscription?.metadata?.supabase_user_id;

      if (userId) {
        await upsertEntitlement({
          userId,
          plan,
          customerId,
          checkoutSessionId: session.id,
          subscriptionId,
          priceId,
          status:
            subscription?.status ??
            (session.payment_status === "paid" ? "active" : "inactive"),
          activeUntil: subscription ? activeUntilFromSubscription(subscription) : null,
        });
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const priceId = subscriptionPriceId(subscription);

      if (userId) {
        const plan = normalizePlan(subscription.metadata?.plan, priceId);
        await upsertEntitlement({
          userId,
          plan,
          customerId: stringId(subscription.customer),
          subscriptionId: subscription.id,
          priceId,
          status: subscription.status,
          activeUntil: activeUntilFromSubscription(subscription),
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }

  return jsonResponse({ received: true });
});
