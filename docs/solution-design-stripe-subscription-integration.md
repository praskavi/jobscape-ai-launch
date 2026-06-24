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

Checkout route:

- Requires Supabase auth.
- Rejects `free` and unknown/inactive plans.
- Reuses the saved Stripe Customer from `user_billing_customers`.
- Creates a Stripe Customer only when no saved mapping exists, then persists it before Checkout.
- Creates a Stripe Checkout Session with `mode = subscription`.
- Sends `customer`, not `customer_email`, to avoid duplicate Stripe customers.
- Sends `metadata.user_id` and `metadata.plan_code`.
- Redirects the browser to Stripe-hosted checkout.

Billing portal route:

- Requires Supabase auth.
- Reads the saved Stripe customer id from `user_billing_customers`.
- Falls back to historical `user_subscriptions.provider_customer_id` and backfills the mapping.
- Creates a Stripe Billing Portal Session.
- Redirects the browser to Stripe-hosted portal.
- For paid-to-paid plan changes, creates a Portal `subscription_update_confirm` flow for the selected plan.
- Sets `flow_data.after_completion.type = redirect` so Stripe automatically returns the browser to `/subscription?billing=updated` after the plan change is confirmed.
- Generic billing management still returns to `/subscription` when the customer uses Stripe's portal return link.

Webhook route:

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

## References

- Stripe Checkout quickstart: https://docs.stripe.com/checkout/quickstart
- Stripe webhooks quickstart: https://docs.stripe.com/webhooks/quickstart
