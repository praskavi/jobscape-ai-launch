# Settings Profile Update

## Jira

- Ticket: KAN-36
- Epic: KAN-11
- Roadmap: https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8585218/6-Week+Roadmap+Task+Tracker+Milestones

## Problem / Goal

The Settings route is currently a placeholder. Users need a working account profile page where they can view and update the profile fields already supported by Supabase.

## Scope

- Replace the placeholder `/settings` page with an authenticated profile settings experience.
- Fetch the current user and `user_profiles` row on the server.
- Allow updates to `full_name`, `phone`, `location`, and `linkedin_url`.
- Display email as read-only because it is owned by Supabase Auth and profile creation.
- Preserve existing Supabase RLS by updating through the browser Supabase client as the signed-in user.

## Out Of Scope

- Job preference fields such as target role, salary range, work arrangement, and notification preferences. These columns do not exist in the current `user_profiles` schema and should be handled by a later schema migration/design.
- Billing and subscription management controls.

## Design

`frontend/src/app/settings/page.tsx` remains a server component that:

- Requires an authenticated Supabase user.
- Reads the matching `user_profiles` row by `user_id`.
- Passes initial profile values to a focused client form.

`frontend/src/components/settings/SettingsProfileForm.tsx` handles:

- Local form state for editable fields.
- Upsert by `user_id` so users without an existing profile row can still save.
- Save button pending state.
- Success and error toast feedback.

The root layout mounts the shared Sonner toaster so profile form feedback is visible across the app.

## Acceptance Criteria

- Authenticated users can open `/settings` and see their email, full name, phone, location, and LinkedIn URL.
- Users can update `full_name`, `phone`, `location`, and `linkedin_url`.
- Empty optional fields are stored as `null`.
- Save feedback is visible on success and failure.
- Unauthenticated users are redirected to `/login`.

## User Stories

### View Profile Settings

- Jira: KAN-11
- Who: As an authenticated JobScrape user.
- What: I want to view my profile details on the Settings page.
- Why: So that I can confirm the account information JobScrape stores for me.

### Update Editable Profile Fields

- Jira: KAN-11
- Who: As an authenticated JobScrape user.
- What: I want to update my full name, phone, location, and LinkedIn URL.
- Why: So that my profile stays accurate for app personalization and future job-search workflows.

### Keep Email Read-Only

- Jira: KAN-11
- Who: As a signed-in user.
- What: I want my email displayed but not edited from the profile form.
- Why: So that identity remains controlled by Supabase Auth rather than a profile table update.

### Block Unauthenticated Access

- Jira: KAN-11
- Who: As the JobScrape system.
- What: I want unauthenticated users redirected from `/settings` to `/login`.
- Why: So that private profile information is only available to the account owner.

## Risks / Notes

- `full_name` is `NOT NULL`; the form requires it before saving.
- RLS must keep allowing authenticated users to read/update their own `user_profiles` rows.
- Broader preference settings need a database migration before UI implementation.
