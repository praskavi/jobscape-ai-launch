# Solution Design: Production Smoke Test

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains

## Problem / Goal

Before production or pre-production releases, JobScrape needs a repeatable smoke test checklist that verifies core user, billing, subscription, document, ATS, and job matching flows after deployment.

## Scope

- Environment variable sanity.
- Authentication.
- Dashboard and settings.
- Resume upload and stored file access.
- ATS scoring.
- AI job matching.
- Stripe checkout and webhook sync.
- Billing Portal upgrade/downgrade.
- Subscription plan/usage display.

## Design

Smoke testing should be run against the deployed URL after environment variables and database migrations are applied.

Minimum checks:

1. App loads.
2. Login succeeds.
3. Protected routes redirect when unauthenticated.
4. Dashboard loads current user and plan.
5. Resume upload succeeds for an entitled user.
6. ATS check succeeds and usage updates.
7. AI job match succeeds for an entitled user.
8. Stripe Checkout returns to `/subscription`.
9. Webhook updates Supabase.
10. Billing Portal plan switch returns to `/subscription?billing=updated`.
11. Subscription summary shows the expected plan.

## User Stories

### Verify Deployment Health

- Jira: KAN-25
- Who: As a release owner.
- What: I want a repeatable smoke test checklist after deployment.
- Why: So that obvious production regressions are caught quickly.

### Verify User Access

- Jira: KAN-25
- Who: As a QA tester.
- What: I want to confirm auth and protected routes work.
- Why: So that private app areas remain secure and usable.

### Verify Paid Subscription Flow

- Jira: KAN-25
- Who: As a release owner.
- What: I want to confirm Checkout, webhook sync, and Billing Portal plan changes work.
- Why: So that billing-related releases do not break paid access.

### Verify Core Product Flows

- Jira: KAN-25
- Who: As a QA tester.
- What: I want to smoke test resume upload, ATS scoring, and job matching.
- Why: So that the app's core job-search value works after deployment.

## Acceptance Criteria

- Smoke test checklist exists and is runnable by a release owner.
- Required test users/accounts are identified.
- Billing and subscription checks include webhook-backed Supabase verification.
- Failures capture enough context for triage.

## Risks / Follow-ups

- Manual smoke tests can drift; high-value steps should become automated.
- Stripe test and live modes must not be mixed.
- Test users need resettable usage/subscription state.
