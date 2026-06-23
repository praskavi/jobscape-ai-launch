# Supabase Linter Security Fixes

## Jira

- Ticket: KAN-38
- Epic: KAN-25

## Problem / Goal

Supabase database linter reports two production-blocking security findings:

- `security_definer_view` for `public.my_files`
- `rls_disabled_in_public` for `public.job_chunks`

The goal is to fix both with a forward-only migration that preserves current application behavior.

## Scope

- Recreate `public.my_files` with `security_invoker = true`.
- Keep `public.my_files` filtered to the current authenticated user through `auth.uid()`.
- Enable RLS on `public.job_chunks`.
- Add read-only RLS policies for `anon` and `authenticated` clients, limited to chunks for jobs they can read.
- Keep direct `job_chunks` writes blocked for client roles. Server-side ingestion and embedding workflows should continue to use the service role.

## Out Of Scope

- Changing embedding/chunk generation workflows.
- Moving `job_chunks` into a private schema.
- Reworking job visibility rules beyond the existing public/readable jobs model.

## Design

`public.my_files` currently joins `user_files` to `user_profiles` and filters with `auth.uid()`. The migration recreates the same projection with:

```sql
WITH (security_invoker = true)
```

This makes Postgres evaluate access using the querying user's permissions and RLS context rather than the view owner.

`public.job_chunks` is tied to public job data by `job_id`. The migration enables RLS and adds SELECT policies for:

- `anon`
- `authenticated`

Each policy only exposes chunks where an associated row exists in `public.jobs`. Because `public.jobs` already has read policies, this keeps chunk read access aligned with job read access. No INSERT, UPDATE, or DELETE policies are created for client roles.

## Acceptance Criteria

- Supabase linter no longer reports `security_definer_view_public_my_files`.
- Supabase linter no longer reports `rls_disabled_in_public_public_job_chunks`.
- Existing app reads from `my_files` continue to work for authenticated users.
- `job_chunks` writes remain unavailable to anon/authenticated clients.

## Verification

After applying the migration, run Supabase database linter again and verify both findings are cleared.
