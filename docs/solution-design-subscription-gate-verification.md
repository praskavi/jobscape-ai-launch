# Solution Design: Subscription Gate Verification

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains
- Task: KAN-33 - Verify subscription gates across free, basic, premium, and admin users
- Confluence roadmap: https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8585218/6-Week+Roadmap+Task+Tracker+Milestones

## Problem / Goal

Subscription gates are now enforced server-side and surfaced in the frontend, but they need a repeatable verification plan before production. The goal is to prove that free, basic, premium, and admin users receive the correct API behavior and UI usage state for gated features.

## Scope

Verify these gated features:

- `resume_upload`
- `ats_score`
- `ai_job_match`
- `resume_generate`
- `cover_letter_generate`
- `premium_recommendations` when recommendations UI is implemented

Verify these subscription states:

- Free user
- Basic user below limit
- Basic user at/over limit
- Premium user
- Admin bypass user
- Unauthenticated request

## Current State

- API routes use `requireFeatureAccess()` and `recordFeatureUsage()`.
- Frontend uses `SubscriptionProvider`, `UsageCounter`, and API response handling.
- The repo does not currently have a committed browser E2E test framework wired in `package.json`.

## Verification Approach

Use a staged approach:

1. Manual/API smoke tests in pre-production with seeded test users.
2. Use `npm run verify:subscription-gates` with pre-production tokens for repeatable API smoke checks.
3. Add browser E2E tests after the app has committed Playwright or equivalent test tooling.

## Smoke Script

Run from `frontend/`:

```bash
SUBSCRIPTION_GATE_BASE_URL=https://your-preprod-url \
SUBSCRIPTION_GATE_RESUME_FILE=/path/to/sample-resume.pdf \
SUBSCRIPTION_GATE_FREE_TOKEN=... \
SUBSCRIPTION_GATE_BASIC_TOKEN=... \
SUBSCRIPTION_GATE_PREMIUM_TOKEN=... \
SUBSCRIPTION_GATE_ADMIN_TOKEN=... \
npm run verify:subscription-gates
```

Only provide tokens for scenarios you want to run. With no tokens, the script verifies that unauthenticated access is rejected.

## Test Matrix

| Scenario | Feature | Expected Result |
| --- | --- | --- |
| Unauthenticated request | Any gated API | `401 Unauthorized` |
| Free user | `ats_score` | `402` with `feature_not_enabled` or configured free-plan behavior |
| Basic user under limit | `ats_score` | Success and usage increments |
| Basic user at limit | `ats_score` | `402` with `usage_limit_reached` |
| Premium user | `ats_score` | Success and usage increments/remaining updates |
| Free user | `ai_job_match` | `402` with `feature_not_enabled` |
| Basic user under limit | `ai_job_match` | Success and usage increments |
| Basic user at limit | `ai_job_match` | `402` with `usage_limit_reached` |
| User with resume upload remaining | `resume_upload` | Upload succeeds and usage increments |
| User over resume upload limit | `resume_upload` | `402` with `usage_limit_reached` |
| User without document generation entitlement | `resume_generate` / `cover_letter_generate` | `402` with `feature_not_enabled` |
| Admin user | Any gated feature | Success through admin bypass |

## Acceptance Criteria

- Test users for free/basic/premium/admin are identified or seeded.
- Each gated API has at least one verified allowed and denied case.
- Usage counters update after successful gated actions.
- Failed gated actions do not increment usage.
- API responses include stable `reason` values for frontend messaging.
- Verification results are documented before production launch.
- `npm run verify:subscription-gates` exists for repeatable API smoke checks.

## Risks / Follow-ups

- Automated tests need deterministic test users and a resettable usage state.
- Browser E2E should not be added until the test runner is committed and stable.
- Admin bypass should be reviewed before production to ensure it is intentional and limited.
