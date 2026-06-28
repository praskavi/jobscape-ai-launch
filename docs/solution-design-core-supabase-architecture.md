# Solution Design: Core Supabase Architecture

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains
- Related: KAN-8, KAN-11, KAN-31, KAN-37, KAN-38, KAN-40, KAN-41

## Problem / Goal

JobScrape uses Supabase for authentication-linked profile data, document storage metadata, subscription entitlements, usage metering, billing sync, AI match caching, and security policies. The goal is to document the core architecture so feature work uses the same ownership and access patterns.

## Scope

- Auth user to profile relationship.
- User files and storage buckets.
- Subscription plans, features, usage, and current subscription.
- Stripe customer/subscription mapping.
- AI job match result caching.
- RLS and service-role boundaries.

## Design

Core identity:

- `auth.users.id` is the authenticated identity.
- `user_profiles.user_id` links app profile data to auth users.
- User-owned tables should reference either auth user id or `user_profiles.id` consistently per table design.

Documents:

- Supabase Storage stores file bytes.
- `user_files` stores metadata and `is_current`.
- `my_files` exposes current user's files through a security-invoker view.

Subscriptions:

- `subscription_plans` defines Free, Basic, and Premium.
- `subscription_features` defines gated features.
- `plan_features` maps plan entitlements and limits.
- `user_subscriptions` stores current and historical subscription state.
- `subscription_usage` tracks metered usage.
- `get_user_subscription_summary()` is the main app read model.

Billing:

- `user_billing_customers` stores durable Stripe customer IDs.
- `payment_events` records webhook events.
- Stripe subscription item prices map to `subscription_plans.stripe_price_id`.

AI data:

- `ai_job_match_runs` caches AI job match results.
- Job embeddings/chunks are read through controlled RLS policies.

## User Stories

### Link Auth To App Profile

- Jira: KAN-25
- Who: As the JobScrape system.
- What: I want every signed-in user linked to an app profile.
- Why: So that files, settings, and app data can be associated with the correct user.

### Store User Documents Securely

- Jira: KAN-25
- Who: As a JobScrape user.
- What: I want my resumes and documents stored privately.
- Why: So that only I can access or manage my job-search files.

### Enforce Plan Entitlements

- Jira: KAN-25
- Who: As the JobScrape system.
- What: I want feature access and usage limits enforced from Supabase-backed subscription data.
- Why: So that app behavior matches Free, Basic, and Premium plan rules.

### Sync Billing State

- Jira: KAN-25
- Who: As the JobScrape system.
- What: I want Stripe webhook events reflected in Supabase subscription tables.
- Why: So that the app can read one authoritative subscription state.

### Preserve Security Boundaries

- Jira: KAN-25
- Who: As a release owner.
- What: I want RLS and service-role usage documented.
- Why: So that client code cannot access or mutate data outside its ownership boundary.

## Acceptance Criteria

- Core user, storage, billing, and AI table responsibilities are documented.
- Auth/profile ownership patterns are clear.
- Subscription read/write models are clear.
- Service-role usage is reserved for trusted server routes and workflows.
- RLS expectations are documented.

## Risks / Follow-ups

- Mixed use of `auth.users.id` and `user_profiles.id` requires careful API joins.
- Migration history should be normalized before long-term production operations.
- Additional ERD documentation would make onboarding easier.
