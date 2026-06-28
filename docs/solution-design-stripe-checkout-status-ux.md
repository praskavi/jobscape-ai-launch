# Solution Design: Stripe Checkout Status UX

## Jira

- Ticket: KAN-42
- Epic: KAN-25
- Related: KAN-40, KAN-41

## Problem / Goal

After Stripe redirects a user back to `/subscription?checkout=success&session_id=...`, the app can briefly show the old plan while the signed webhook is still updating Supabase. The goal is to make that return path clear and reassuring without treating the browser redirect as the source of truth.

## Scope

- Detect `checkout=success`, `checkout=cancelled`, and `billing=updated` query parameters on the subscription page.
- Show a friendly success, cancelled, or syncing state.
- Refresh subscription state after checkout or portal return.
- Optionally add a display-only checkout status endpoint that retrieves the Stripe Checkout Session by `session_id`.
- Keep paid access based on webhook-backed Supabase state.

## Design

The subscription page should treat redirect query params as UX signals only.

For `checkout=success`:

1. Show "Payment received. Syncing your subscription..." or similar copy.
2. Refresh `get_user_subscription_summary()`.
3. If the current plan updates, show the active plan state.
4. If still stale after a short interval, keep the user informed rather than falling back silently.

For `checkout=cancelled`:

1. Show a neutral cancelled message.
2. Do not change plan state.

For `billing=updated`:

1. Show "Plan update received. Syncing..." while webhook-backed state catches up.
2. Refresh subscription summary.

Optional endpoint:

- `GET /api/billing/checkout-status?session_id=...`
- Requires auth.
- Verifies the session belongs to the authenticated user through `client_reference_id` or metadata.
- Returns display-only Stripe session status.
- Does not grant access.

## User Stories

### See Payment Syncing State

- Jira: KAN-42
- Who: As a user returning from successful Stripe Checkout.
- What: I want to see that my payment is being synced.
- Why: So that I am not confused if the page briefly shows my old plan.

### See Cancelled Checkout State

- Jira: KAN-42
- Who: As a user who cancels Stripe Checkout.
- What: I want to return to the subscription page with a clear cancelled message.
- Why: So that I know I was not charged and my plan was not changed.

### Refresh Plan After Redirect

- Jira: KAN-42
- Who: As a subscribed user.
- What: I want the app to refresh my subscription summary after returning from Stripe.
- Why: So that the UI catches up after webhook-backed Supabase state changes.

### Keep Redirects Non-Authoritative

- Jira: KAN-42
- Who: As the JobScrape system.
- What: I want redirects to be UX-only and not grant paid access.
- Why: So that users cannot get paid features by manually visiting a success URL.

## Acceptance Criteria

- Subscription page detects checkout and billing query params.
- Success and cancelled states are visible to users.
- Subscription summary is refreshed after Stripe return.
- UI does not grant access based only on query params.
- Optional status endpoint verifies user ownership of `session_id`.
- Lint/build pass.

## Risks / Follow-ups

- Polling too aggressively can create unnecessary load.
- A checkout status endpoint must not leak another user's Stripe session data.
- Webhook-backed Supabase state remains the source of truth.
