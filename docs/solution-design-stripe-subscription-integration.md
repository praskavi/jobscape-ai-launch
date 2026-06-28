# Stripe Subscription Integration

## Jira

- Ticket: KAN-40
- Follow-up: KAN-41
- Epic: KAN-25

## Problem / Goal

Jobscape AI has Supabase subscription tables and entitlement gates, but paid plans are not connected to a payment provider. Users need a Stripe-hosted checkout flow for Basic and Premium plans, and Stripe subscription lifecycle events must update `user_subscriptions`.

## Scope

- Add Stripe SDK server support.
- Add server-only Stripe environment variables.
- Add trusted Stripe price ids to `subscription_plans`.
- Add durable Stripe customer id mapping per user.
- Add an authenticated Checkout Session route.
- Add an authenticated Billing Portal route.
- Add a Stripe webhook route that verifies signatures, records events, and syncs subscription state.
- Wire the Subscription page plan buttons to checkout/portal actions.

## Design

Stripe Checkout remains server-driven. The browser submits a plan code only. The server resolves that plan code to a Supabase `subscription_plans` row and uses the stored `stripe_price_id`.

## Checkout Flow

Checkout is used for free-to-paid conversion.

- Requires Supabase auth.
- Rejects `free` and unknown/inactive plans.
- Reuses the saved Stripe Customer from `user_billing_customers`.
- Creates a Stripe Customer only when no saved mapping exists, then persists it before Checkout.
- Creates a Stripe Checkout Session with `mode = subscription`.
- Sends `customer`, not `customer_email`, to avoid duplicate Stripe customers.
- Sends `metadata.user_id` and `metadata.plan_code`.
- Redirects the browser to Stripe-hosted checkout.
- Uses `success_url = /subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`.
- Uses `cancel_url = /subscription?checkout=cancelled`.

Checkout return flow:

1. User clicks Basic or Premium while on the Free plan.
2. Browser calls `POST /api/billing/checkout` with `planCode`.
3. Server creates or reuses the Stripe customer and creates the Checkout Session.
4. Browser redirects to Stripe Checkout.
5. Stripe redirects the browser back to `/subscription?checkout=success&session_id=...` or `/subscription?checkout=cancelled`.
6. The redirect is for UX only. It must not be used as fulfillment.
7. Stripe webhook updates Supabase.
8. The app reads current plan through `get_user_subscription_summary()`.

Key learning:

- The browser may return before the webhook finishes. If the user briefly sees an old plan after payment, the UI should refresh/poll or show a syncing state.
- A future UX endpoint can inspect `session_id` for display status, but subscription access must still be granted only from webhook-backed Supabase state.

## Upgrade / Downgrade Flow

Stripe Billing Portal is used for paid-to-paid plan changes.

- Requires Supabase auth.
- Reads the saved Stripe customer id from `user_billing_customers`.
- Falls back to historical `user_subscriptions.provider_customer_id` and backfills the mapping.
- Creates a Stripe Billing Portal Session.
- Redirects the browser to Stripe-hosted portal.
- For paid-to-paid plan changes, creates a Portal `subscription_update_confirm` flow for the selected plan.
- Sets `flow_data.after_completion.type = redirect` so Stripe automatically returns the browser to `/subscription?billing=updated` after the plan change is confirmed.
- Generic billing management still returns to `/subscription` when the customer uses Stripe's portal return link.
- Requires Stripe Dashboard Customer Portal settings to allow subscription updates and include Basic/Premium products/prices in the portal product catalog.

Upgrade/downgrade return flow:

1. User on Basic clicks Premium, or user on Premium clicks Basic.
2. Browser calls `POST /api/billing/portal` with target `planCode`.
3. Server verifies the user has an active Stripe subscription.
4. Server retrieves the Stripe subscription and active subscription item.
5. Server creates a Billing Portal `subscription_update_confirm` session with the target Stripe price.
6. Browser redirects to Stripe Billing Portal.
7. User confirms the plan change.
8. Stripe redirects back to `/subscription?billing=updated`.
9. Stripe sends `customer.subscription.updated`.
10. Webhook resolves the new plan from the active Stripe subscription item price and updates Supabase.
11. The app reads the updated plan through `get_user_subscription_summary()`.

Key learning:

- Do not rely on `subscription.metadata.plan_code` for upgrade/downgrade sync. Stripe Portal can change the subscription item price while leaving old metadata in place.
- The webhook must prefer the actual Stripe subscription item price id over metadata.
- Metadata remains useful as a fallback for checkout-created subscriptions, but price id is the authoritative source for plan mapping after Portal changes.

Why metadata can be stale:

Stripe metadata is custom app-owned key-value data. When Checkout creates a subscription, this app sets metadata such as:

```json
{
  "user_id": "...",
  "plan_code": "basic"
}
```

If the user later switches from Basic to Premium in Stripe Billing Portal, Stripe updates the subscription item price, but it does not automatically rewrite custom metadata from `basic` to `premium`. Stripe does not know that this app's `plan_code` metadata should mirror the active subscription item price.

After a portal upgrade, the Stripe subscription can legitimately look like:

```text
metadata.plan_code = basic
subscription.items.data[0].price.id = price_premium
```

The first value is stale app context. The second value is what Stripe is actually billing. For that reason, webhook sync must treat the subscription item price as billing truth and use metadata only as fallback.

## Webhook Flow

- Uses raw request body and `STRIPE_WEBHOOK_SECRET` to verify signatures.
- Inserts each Stripe event into `payment_events`.
- Handles subscription lifecycle events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Upserts `user_subscriptions` by `provider_subscription_id`.
- Upserts `user_billing_customers` by user and provider.
- Syncs Supabase status and current billing period fields.
- Resolves plan by Stripe subscription item price id first, then falls back to metadata plan code.

Webhook source of truth:

- `checkout.session.completed` can retrieve and sync the Stripe subscription.
- `customer.subscription.created` and `customer.subscription.updated` are the main lifecycle events that keep Supabase current.
- `customer.subscription.deleted` marks cancellation/deletion state.
- `payment_events` records every Stripe event id for traceability and idempotency.

Webhook-backed Supabase state is the application source of truth:

```text
Stripe event
  -> /api/billing/webhook
  -> verify Stripe signature
  -> update Supabase
  -> app reads Supabase
```

The app must not grant access from the browser redirect alone:

```text
Browser redirected to /subscription?checkout=success
  -> assume payment succeeded
  -> give access
```

Browser redirects are useful for user experience but are not reliable or authoritative. A user can close the tab before the redirect finishes, lose network after payment, refresh midway, manually visit a success URL, or reuse an old success URL. Therefore `/subscription?checkout=success` should only show a friendly syncing/success state. Basic/Premium access should come from Supabase after a signed Stripe webhook has updated `user_subscriptions`.

In this app:

- Stripe is the payment authority.
- The webhook is the trusted messenger.
- Supabase is the app authority.
- Browser redirects are navigation only.

## App Read Flow

The app does not ask Stripe directly to decide what plan the user has during normal rendering.

Plan and entitlement display comes from Supabase:

- `/subscription` calls `get_user_subscription_summary()` in `frontend/src/app/subscription/page.tsx`.
- Dashboard components read `SubscriptionContext`, which also calls `get_user_subscription_summary()`.
- Feature gates and usage widgets depend on the same summary/entitlement model.

Key learning:

- `get_user_subscription_summary()` must select `us.plan_id`, because it uses `v_subscription.plan_id` to load plan features.
- The function should prefer paid/current statuses over Free if more than one current-like row exists.
- When this RPC fails, frontend context can fall back to no summary, which looks like Free even when Stripe and webhook sync succeeded.

## Current Plan Highlighting

The subscription page has two different visual concepts:

- Recommended plan.
- Current plan.

Key learning:

- Basic can be highlighted as recommended only while the current user is on Free.
- Once a user is Basic or Premium, the current paid plan should be visually emphasized.
- Otherwise a Premium user can correctly have Premium access while still seeing the Basic card highlighted, which is misleading.

## Data Model

Add nullable fields to `subscription_plans`:

- `stripe_price_id text`
- `stripe_product_id text`

The app uses `stripe_price_id` for Checkout. Stripe metadata and webhook subscription items provide fallback mapping back to a plan.

Add `user_billing_customers`:

- `user_id uuid`
- `payment_provider text`
- `provider_customer_id text`
- `billing_email text`

`user_billing_customers` is the durable source of truth for Stripe customer reuse. `user_subscriptions.provider_customer_id` remains on subscription rows for audit and webhook sync context.

Important relationships:

- `auth.users.id` -> `user_billing_customers.user_id`
- `user_billing_customers.provider_customer_id` -> Stripe `cus_...`
- `user_subscriptions.provider_subscription_id` -> Stripe `sub_...`
- `subscription_plans.stripe_price_id` -> Stripe recurring `price_...`

## Operational Lessons

- DigitalOcean/preprod must include all server env vars, especially `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Stripe price ids, and `SUPABASE_SERVICE_ROLE_KEY`.
- If Checkout returns `Stripe is not configured`, the running server cannot see `STRIPE_SECRET_KEY`.
- After changing env vars in DigitalOcean, redeploy or restart the app.
- Stripe secrets pasted into chat or logs must be rotated.
- Live Supabase migrations should be applied deliberately with targeted SQL when the local migration history is not clean.
- Always verify Stripe state and Supabase state separately when debugging:
  - Stripe Checkout Session status.
  - Stripe Subscription status and item price.
  - `user_subscriptions` row.
  - `payment_events` processed event.
  - `get_user_subscription_summary()` output.

## Environment Variables

Server-only:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BASIC_PRICE_ID`
- `STRIPE_PREMIUM_PRICE_ID`
- `NEXT_PUBLIC_APP_URL`

## Acceptance Criteria

- Users can click Basic/Premium plan buttons and reach Stripe Checkout.
- Checkout reuses a saved Stripe customer id and does not pass `customer_email`.
- Current paid subscribers can open Stripe Billing Portal.
- Stripe webhook events are signature-verified and recorded in `payment_events`.
- Subscription updates sync into `user_subscriptions`.
- Stripe price ids are not trusted from the client.

## User Stories

### Start Paid Checkout

- Jira: KAN-40
- Who: As a logged-in JobScrape user on the Free plan.
- What: I want to choose Basic or Premium and be redirected to Stripe Checkout.
- Why: So that I can securely subscribe to a paid plan and unlock paid limits/features.

### Reuse Stripe Customer

- Jira: KAN-41
- Who: As a returning JobScrape user.
- What: I want the app to reuse my saved Stripe customer id for Checkout and Billing Portal.
- Why: So that duplicate Stripe customers are not created and my billing history remains connected.

### Return After Checkout

- Jira: KAN-42
- Who: As a user completing or cancelling Stripe Checkout.
- What: I want to return to the subscription page with a clear success or cancelled state.
- Why: So that I understand what happened and can continue using the app.

### Sync Subscription From Webhooks

- Jira: KAN-40
- Who: As the JobScrape system.
- What: I want signed Stripe webhook events to update Supabase subscription state.
- Why: So that paid access is based on trusted Stripe events, not browser redirects.

### Upgrade Or Downgrade Plan

- Jira: KAN-40
- Who: As a Basic or Premium subscriber.
- What: I want to switch plans through Stripe Billing Portal and return to JobScrape.
- Why: So that I can adjust my subscription without support intervention.

### Resolve Plan From Stripe Price

- Jira: KAN-40
- Who: As the JobScrape system.
- What: I want webhook sync to map the active Stripe price id to the app plan.
- Why: So that Portal upgrades/downgrades sync correctly even when Stripe metadata is stale.

### Display Current Plan Correctly

- Jira: KAN-40
- Who: As a subscribed JobScrape user.
- What: I want the subscription page and dashboard to show and highlight my current plan.
- Why: So that I can trust what access level I currently have.

## References

- Stripe Checkout quickstart: https://docs.stripe.com/checkout/quickstart
- Stripe webhooks quickstart: https://docs.stripe.com/webhooks/quickstart
