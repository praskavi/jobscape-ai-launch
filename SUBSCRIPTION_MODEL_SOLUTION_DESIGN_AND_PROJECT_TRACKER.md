# Subscription Model Solution Design And Project Tracker

## 1. Purpose

This document defines the Jobscape AI subscription model solution design and tracks delivery across phases.

The subscription model controls access to paid AI features, enforces usage limits, and prepares the product for future Stripe billing.

## 2. Business Plans And Entitlements

| Feature | Feature Code | Feature Type | Free | Basic - $19 | Premium - $49 |
|---|---|---|---|---|---|
| Job Browsing | Ungated | N/A | Unlimited | Unlimited | Unlimited |
| Job Search | `job_search` | `unlimited` | Unlimited | Unlimited | Unlimited |
| Resume Upload | `resume_upload` | `usage_limited` | 1 active resume | 1 active resume | 3 active resumes |
| ATS Score Check | `ats_score` | `usage_limited` | 3 / month | 10 / month | 60 / month |
| AI Job Match | `ai_job_match` | `usage_limited` | Disabled | 20 / month | 50 / month |
| Resume Enhancements | `resume_generate` | `usage_limited` | Disabled | 10 / month | 30 / month |
| Cover Letter Generation | `cover_letter_generate` | `usage_limited` | Disabled | 10 / month | 20 / month |
| Premium Recommendations | `premium_recommendations` | `boolean` | Disabled | Enabled, Top 10 | Enabled, Top 20 |

## 3. Architecture

### Source Of Truth

Supabase is the source of truth for:

- Current user plan
- Subscription status
- Feature entitlements
- Usage limits
- Monthly usage consumption

The frontend only displays subscription state and improves user experience. Backend/API/RPC enforcement is required for all paid or usage-limited actions.

### Supabase Tables

| Table | Purpose |
|---|---|
| `subscription_plans` | Stores Free, Basic, and Premium plan metadata. |
| `subscription_features` | Stores feature definitions and feature types. |
| `plan_features` | Maps plan entitlements and limits. |
| `user_subscriptions` | Stores each user's current subscription. |
| `subscription_usage` | Tracks per-user monthly usage. |
| `payment_events` | Stores future Stripe/payment webhook events. |

### Supabase RPCs And Views

| Object | Purpose |
|---|---|
| `can_use_feature(p_user_id, p_feature_code)` | Checks whether a user can use a feature. |
| `increment_usage(p_user_id, p_feature_code)` | Atomically increments usage after successful action. |
| `get_user_subscription_summary()` | Returns current authenticated user's plan and feature usage. |
| `user_subscription_entitlements` | Authenticated current-user entitlement view. |
| `assign_free_subscription()` | Assigns Free plan on signup. |
| `sync_subscription_tier()` | Syncs cached tier to `user_profiles.subscription_tier`. |

## 4. Implemented Application Behaviour

### Subscription Page

Route: `/subscription`

Implemented:

- Protected app route.
- Sidebar navigation item.
- Shows current plan and status.
- Reads live subscription summary from Supabase.
- Displays key usage and entitlement cards.
- Shows Free / Basic / Premium plan cards.

### API Enforcement

Implemented backend enforcement:

| API | Feature Enforced | Usage Increment Timing |
|---|---|---|
| `/api/analyze-ats` | `ats_score` | After successful analysis |
| `/api/find-jobs` | `ai_job_match` | After successful match generation |
| `/api/generate-resume-enhancement` | `resume_generate` | After successful generation |
| `/api/generate-cover-letter` | `cover_letter_generate` | After successful generation |

### Premium Recommendations

Implemented:

- Basic users receive top 10 AI Job Match results.
- Premium users receive top 20 AI Job Match results.

### Error Handling

Implemented:

- Subscription failures return HTTP `402`.
- Client shows user-friendly messages for:
  - Feature not included in current plan
  - Monthly allowance reached
  - Subscription entitlement unavailable

## 5. Delivery Tracker

| Phase | Name | Status | Summary |
|---|---|---|---|
| Phase 1 | Subscription schema and entitlements | Complete | Live Supabase tables, features, plan mappings, RPCs, and hardening were applied. |
| Phase 2 | Subscription page and route protection | Complete | `/subscription` page added, protected, and wired to live summary RPC. |
| Phase 3 | Core paid feature enforcement | Complete | ATS Score and AI Job Match are backend-gated and usage-tracked. |
| Phase 4 | Additional paid feature APIs | Complete | Resume enhancement and cover letter APIs added with entitlement checks. Premium recommendation limits applied. |
| Phase 5 | Billing and upgrade flow | Not started | Stripe checkout, webhook processing, and upgrade buttons remain. |
| Phase 6 | Multi-resume Premium support | Not started | Premium 3 active resumes needs schema/UI changes. |
| Phase 7 | Feature UI for generators | Not started | UI pages/components for resume enhancement and cover letter generation need to be built. |
| Phase 8 | QA and release validation | In progress | Lint/build passed locally; preprod functional validation remains. |

## 6. Phase Details

### Phase 1: Subscription Schema And Entitlements

Status: Complete

Completed:

- Free / Basic / Premium plan model.
- Entitlement matrix seeded.
- `can_use_feature` hardened so authenticated users can only check their own user ID.
- `increment_usage` hardened so authenticated users can only increment their own user ID.
- Anon access removed from sensitive entitlement RPCs.
- `get_user_subscription_summary()` created.
- `user_subscription_entitlements` restricted to authenticated current-user access.
- `sync_subscription_tier()` fixed to use `user_profiles.user_id`.

Acceptance criteria:

- New users receive Free subscription.
- Authenticated user can read own subscription summary.
- Users cannot check or increment usage for another user.
- Backend can evaluate feature access before paid work runs.

### Phase 2: Subscription Page And Route Protection

Status: Complete

Completed:

- `/subscription` page created.
- `/subscription` added to authenticated layout.
- `/subscription` added to sidebar.
- `/subscription` protected in Supabase middleware.
- Pricing copy aligned to Free / Basic / Premium.

Acceptance criteria:

- Logged-out user cannot access `/subscription`.
- Logged-in user can see their current plan.
- Usage cards show live entitlement data.

### Phase 3: Core Paid Feature Enforcement

Status: Complete

Completed:

- `ats_score` enforced in `/api/analyze-ats`.
- `ai_job_match` enforced in `/api/find-jobs`.
- Usage increments only after successful processing.
- Subscription errors surfaced in ATS Checker and AI Job Match UI.

Acceptance criteria:

- Free users can run 3 ATS checks per month.
- Free users cannot run AI Job Match.
- Basic users can run AI Job Match up to 20/month.
- Premium users can run AI Job Match up to 50/month.

### Phase 4: Additional Paid Feature APIs

Status: Complete

Completed:

- `/api/generate-resume-enhancement` added.
- `/api/generate-cover-letter` added.
- Both APIs authenticate user, check entitlement, generate with OpenAI, and increment usage after success.
- Premium AI Job Match returns top 20 recommendations; Basic returns top 10.

Acceptance criteria:

- Free users are blocked from resume enhancement and cover letter generation.
- Basic users can use resume enhancement 10/month and cover letter generation 10/month.
- Premium users can use resume enhancement 30/month and cover letter generation 20/month.

### Phase 5: Billing And Upgrade Flow

Status: Not started

Scope:

- Add Stripe products/prices for Basic and Premium.
- Add checkout session API.
- Add webhook handler for subscription lifecycle events.
- Update `user_subscriptions` from Stripe webhooks.
- Store webhook payloads in `payment_events`.
- Add upgrade buttons on `/subscription`.

Acceptance criteria:

- User can upgrade from Free to Basic/Premium.
- Successful payment updates subscription.
- Failed/cancelled subscription changes access.
- Webhook events are recorded.

### Phase 6: Multi-Resume Premium Support

Status: Not started

Scope:

- Replace one-resume-per-profile assumption.
- Allow Premium users up to 3 active resumes.
- Add resume selector for ATS, AI Job Match, resume enhancement, and cover letter generation.
- Add primary/default resume logic.
- Enforce active resume count by plan.

Important constraint:

Current dashboard and `user_files` flow are still designed around one resume and one cover letter per user/profile type. This must be changed carefully as a dedicated feature.

Acceptance criteria:

- Free/Basic users can keep 1 active resume.
- Premium users can keep 3 active resumes.
- User can choose which resume to use for AI features.
- Existing single-resume users are not broken.

### Phase 7: Feature UI For Generators

Status: Not started

Scope:

- Build UI for resume enhancement.
- Build UI for cover letter generation.
- Show usage remaining before generation.
- Show locked/upgrade state when feature is unavailable.
- Allow copy/download of generated output.

Acceptance criteria:

- Basic/Premium users can generate outputs from the UI.
- Free users see a clear upgrade prompt.
- Usage decrements only after successful generation.

### Phase 8: QA And Release Validation

Status: In progress

Completed:

- Local lint passed.
- Local production build passed.
- Subscription SQL applied to linked Supabase.
- Changes pushed to `main`.

Remaining:

- Validate DigitalOcean/preprod deployment.
- Confirm Supabase environment variables on deployment.
- Test Free, Basic, and Premium users.
- Test usage limit boundaries.
- Test blocked feature messaging.

## 7. Testing Checklist

### Free User

- Can access `/subscription`.
- Sees Free plan.
- Can run ATS score 3 times/month.
- 4th ATS score is blocked.
- AI Job Match is blocked.
- Resume enhancement is blocked.
- Cover letter generation is blocked.

### Basic User

- Sees Basic plan.
- AI Job Match allows 20/month.
- AI Job Match returns top 10 recommendations.
- ATS score allows 10/month.
- Resume enhancement allows 10/month.
- Cover letter generation allows 10/month.

### Premium User

- Sees Premium plan.
- AI Job Match allows 50/month.
- AI Job Match returns top 20 recommendations.
- ATS score allows 60/month.
- Resume enhancement allows 30/month.
- Cover letter generation allows 20/month.

### Security

- Logged-out user is redirected from `/subscription`.
- Logged-out API calls return unauthorized.
- Authenticated user cannot call entitlement RPCs for another user ID.
- Usage is not incremented when generation/analysis fails.

## 8. Known Gaps

- No Stripe billing or self-upgrade flow yet.
- Multi-resume Premium support is not implemented.
- Resume enhancement and cover letter APIs exist, but frontend UI is not built yet.
- No automated test suite for entitlement RPCs yet.
- `resume_upload` entitlement is modeled but not fully enforced for Premium's 3-resume requirement.

## 9. Recommended Next Tickets

| Ticket | Priority | Description |
|---|---|---|
| SUB-UI-001 | P1 | Build resume enhancement UI and connect to `/api/generate-resume-enhancement`. |
| SUB-UI-002 | P1 | Build cover letter generation UI and connect to `/api/generate-cover-letter`. |
| SUB-BILL-001 | P1 | Add Stripe checkout for Basic and Premium. |
| SUB-BILL-002 | P1 | Add Stripe webhook handler and update `user_subscriptions`. |
| SUB-RESUME-001 | P2 | Add Premium multi-resume support and resume selector. |
| SUB-QA-001 | P1 | Execute subscription entitlement QA matrix in preprod. |
| SUB-TEST-001 | P2 | Add automated tests for subscription RPCs/API enforcement. |

## 10. Current Release Notes

Latest completed commits:

- `3259807 Add subscription entitlements and route gating`
- `3108097 Add gated document generation APIs`

Current release value:

- Jobscape AI now has database-backed subscription entitlements.
- Paid AI actions are enforced on the backend.
- Usage is tracked only after successful paid actions.
- The app is ready for billing integration and generator UI build-out.
