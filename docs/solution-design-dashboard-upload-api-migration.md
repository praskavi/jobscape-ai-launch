# Solution Design: Dashboard Upload API Migration

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains
- Task: KAN-32 - Migrate dashboard resume upload to gated upload API
- Confluence roadmap: https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8585218/6-Week+Roadmap+Task+Tracker+Milestones

## Problem / Goal

Dashboard document upload currently writes directly from the browser to Supabase Storage and `user_files`. That path bypasses the production `/api/upload-resume` route, so resume uploads can skip server-side validation, subscription entitlement checks, and usage recording.

The goal is to route dashboard resume uploads through `/api/upload-resume` while preserving the existing dashboard UX and file display behavior.

## Current State

- `/api/upload-resume` performs auth, feature access checks, server-side validation, storage upload, `user_files` insert/update, and usage increment.
- Dashboard `handleUpload()` uploads directly to Supabase Storage and upserts `user_files`.
- Cover letter uploads are document storage only and are not processed by the resume pipeline.

## Proposed Approach

- For `resume` uploads from the dashboard, call `/api/upload-resume` with the current user's bearer token and `FormData`.
- Use the API response to update dashboard state with the uploaded document metadata.
- Refresh subscription state after a successful resume upload.
- Do not trigger n8n from resume or cover letter upload in the current architecture.
- Keep `cover_letter` uploads on the existing direct Supabase path unless/until a dedicated gated API is created for cover letters.
- Improve upload error handling so subscription and validation errors surface in the dashboard UI.

## Data / API Impact

No schema changes.

Uses existing API:

- `POST /api/upload-resume`

Uses existing feature entitlement:

- `resume_upload`

## Security Considerations

Resume upload authorization and validation must happen server-side. The client-side dashboard should not duplicate the source of truth for subscription entitlement, file type, file size, or storage path.

Direct client uploads for cover letters remain a follow-up risk if cover letters later need subscription gating or server-side validation.

## Acceptance Criteria

- Dashboard resume upload calls `/api/upload-resume`.
- Resume upload consumes/refreshes `resume_upload` usage.
- Resume upload still updates the dashboard resume card.
- Resume upload errors show useful messages for validation, auth, and subscription failures.
- Cover letter upload behavior remains unchanged.
- Existing lint and production build pass.

## User Stories

### Upload Resume Through The Gated API

- Jira: KAN-25
- Who: As a logged-in JobScrape user.
- What: I want dashboard resume uploads to use the same upload API as the rest of the app.
- Why: So that validation, storage writes, and subscription checks are applied consistently.

### See Useful Upload Errors

- Jira: KAN-25
- Who: As a user uploading a resume from the dashboard.
- What: I want clear error messages when an upload fails because of auth, validation, or plan limits.
- Why: So that I know whether to sign in again, choose a valid file, delete a resume, or upgrade.

### Preserve Cover Letter Upload Behavior

- Jira: KAN-25
- Who: As a user managing documents.
- What: I want existing cover letter uploads to keep working while resume uploads move to the gated API.
- Why: So that this migration does not break unrelated document storage workflows.

### Enforce Server-Side Upload Rules

- Jira: KAN-25
- Who: As the JobScrape system.
- What: I want resume upload entitlement and validation enforced server-side.
- Why: So that clients cannot bypass plan limits or file validation by writing directly to Supabase.

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`

## Follow-ups

- Consider a dedicated `/api/upload-document` route for cover letters if cover letters need the same server-side path.
