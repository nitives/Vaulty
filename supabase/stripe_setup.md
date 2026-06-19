# Vaulty Stripe Sync Setup

Create these Stripe Prices under your Vaulty product:

- `$1 USD / month` recurring for Vaulty Sync
- `$8 USD / year` recurring for Vaulty Sync
- `$2.99 USD` for Supporter

The supporter price can be one-time or recurring. Each price has its own
`price_...` ID. Add all three IDs to Supabase Edge Function secrets. `APP_URL`
is required and must be an `http` or `https` URL used for Stripe return links:

```bash
npx supabase login
```

```bash
npx supabase secrets set --project-ref ajntebopvexulelgfjog \
  STRIPE_SECRET_KEY=sk_live_or_test_... \
  STRIPE_SYNC_MONTHLY_PRICE_ID=price_1_dollar_monthly_... \
  STRIPE_SYNC_YEARLY_PRICE_ID=price_8_dollar_yearly_... \
  STRIPE_SUPPORTER_PRICE_ID=price_2_99_supporter_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  APP_URL=http://localhost:3000
```

Deploy the functions:

```bash
npx supabase functions deploy create-checkout-session --project-ref ajntebopvexulelgfjog --use-api
npx supabase functions deploy customer-portal --project-ref ajntebopvexulelgfjog --use-api
npx supabase functions deploy stripe-webhook --project-ref ajntebopvexulelgfjog --use-api
```

In Stripe, add a webhook endpoint pointing to:

```text
https://ajntebopvexulelgfjog.supabase.co/functions/v1/stripe-webhook
```

Subscribe it to:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

Run `supabase/vaulty_sync.sql` in the Supabase SQL editor after deploying this
schema. It creates the private `vault-assets` bucket, enables Realtime for
`public.vault_records`, and gates record/media sync behind active or trialing
rows in either `public.sync_entitlements` or `public.supporter_entitlements`.

`supabase/config.toml` marks only `stripe-webhook` with `verify_jwt = false`.
That lets Stripe call the webhook without a Supabase user token while the
function still verifies Stripe's webhook signature using `STRIPE_WEBHOOK_SECRET`.
