# Solution Design: Subscription Frontend Entitlements

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains
- Task: KAN-31 - Wire SubscriptionContext, usage counters, and dashboard plan summary
- Confluence roadmap: https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8585218/6-Week+Roadmap+Task+Tracker+Milestones

## Problem / Goal

The backend subscription entitlement layer is already deployed and API routes enforce feature access with `can_use_feature()` and `increment_usage()`. The frontend needs a shared subscription state layer so users can see their current plan, monthly usage, and feature availability across ATS scoring, AI job matching, and AI document tools.

This closes the frontend gap for roadmap tasks 59-62 by introducing a reusable client-side subscription context and visible usage counters.

## Current State

- API routes already call `requireFeatureAccess()` and `recordFeatureUsage()`.
- The subscription page fetches `get_user_subscription_summary()` server-side.
- Individual feature screens show subscription errors after an API call fails.
- There was no shared client-side subscription context or reusable usage UI.

## Proposed Approach

Add a `SubscriptionProvider` at the root app layout. The provider fetches `get_user_subscription_summary()` from Supabase after authentication, exposes feature access through hooks, and supports explicit refresh after successful gated actions.

Add reusable components:

- `UsageCounter`: displays used/limit/locked/unlimited state for a feature.
- `FeatureGate`: renders children when a feature is enabled, otherwise renders an upgrade prompt.
- `PlanUsageSummary`: shows current plan and core feature usage on the dashboard.

Refresh subscription state after successful gated actions:

- ATS score generation
- Advanced ATS AI insight generation
- AI job match search
- Resume enhancement generation
- Cover letter generation

## Files

- `frontend/src/contexts/SubscriptionContext.tsx`
- `frontend/src/components/subscription/UsageCounter.tsx`
- `frontend/src/components/subscription/FeatureGate.tsx`
- `frontend/src/components/subscription/PlanUsageSummary.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/ATSchecker/ATSChecker.tsx`
- `frontend/src/components/AIJobMatch/AIJobMatch.tsx`
- `frontend/src/components/dashboard/DocumentGenerators.tsx`
- `frontend/src/components/dashboard/DashboardPage.tsx`
- `frontend/src/components/layout/Header.tsx`

## Data / API Impact

No schema changes.

The frontend reads the existing Supabase RPC:

- `get_user_subscription_summary()`

Existing gated APIs continue to enforce access server-side:

- `/api/analyze-ats`
- `/api/find-jobs`
- `/api/generate-resume-enhancement`
- `/api/generate-cover-letter`

## Security Considerations

The frontend subscription context is informational and UX-oriented only. It must not be trusted for authorization. Server-side feature gates remain the source of truth through Supabase RPCs and API route checks.

Admin bypass remains server-side in `subscriptionEntitlements.ts`.

## Acceptance Criteria

- Authenticated users have subscription summary loaded after login.
- Dashboard shows current plan and usage summary.
- ATS checker shows ATS score usage.
- AI Job Match shows AI match usage.
- AI document tools show resume enhancement and cover letter usage.
- Usage counters refresh after successful gated API calls.
- Feature gate component exists for future gated UI sections.
- Production build and lint pass.

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`

## Risks / Follow-ups

- Dashboard direct document upload still bypasses `/api/upload-resume`; migrate it to the API route so subscription usage and n8n webhook behavior are consistent.
- Add Realtime processing status UI for resume uploads.
- Add E2E subscription gate tests for free/basic/premium users.
