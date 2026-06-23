# Solution Design: Environment and Secrets Audit

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains
- Task: KAN-34 - Audit frontend environment variables and secret exposure before production
- Confluence roadmap: https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8585218/6-Week+Roadmap+Task+Tracker+Milestones

## Problem / Goal

Before production deployment, the project needs a clear inventory of required environment variables, which ones are browser-safe, which ones must remain server-side only, and which secrets need rotation. This is especially important because an OpenAI API key has been exposed in local IDE/chat context.

## Current State

The frontend currently references these environment variables:

| Variable | Used By | Exposure | Required |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase browser/server clients | Browser-safe public URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser/server clients | Browser-safe anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server API routes for privileged Supabase access | Server-only secret | Recommended for production |
| `SUPABASE_SERVICE_ROLE` | Legacy fallback for service role key | Server-only secret | Optional fallback |
| `HUGGINGFACE_API_KEY` | Semantic ATS / AI job match embedding calls | Server-only secret | Yes for AI matching |
| `OPENAI_API_KEY` | ATS/document generation helpers | Server-only secret | Yes if OpenAI-backed generation is enabled |
| `CORS_ALLOWED_ORIGINS` | API CORS allowlist | Server-only config | Recommended for production |

Other findings:

- CORS origins support `CORS_ALLOWED_ORIGINS` with safe fallback defaults.
- No `NEXT_PUBLIC_` prefix should be used for OpenAI, HuggingFace, Supabase service role, or future signing secrets.
- Any exposed API key must be rotated before production use.

## Proposed Approach

- Add a tracked `frontend/.env.example` with placeholders only.
- Keep real `.env.local` ignored.
- Verify Vercel/pre-production environment variables match the example.
- Rotate the exposed OpenAI API key.
- Prefer `SUPABASE_SERVICE_ROLE_KEY` over the legacy `SUPABASE_SERVICE_ROLE` fallback.
- Revisit CORS configuration before launch if production domains change.

## Acceptance Criteria

- Required frontend env vars are documented.
- Server-only secrets are clearly marked.
- Browser-safe variables are limited to `NEXT_PUBLIC_*` Supabase public values.
- `.env.local` remains ignored.
- Exposed OpenAI key is rotated before production launch.
- `npm.cmd run lint` passes.
- `npm.cmd run build` passes.

## Verification

- Review source env usage with `rg "process\\.env\\." frontend/src`.
- Compare Vercel/pre-production env vars against `frontend/.env.example`.
- Confirm old exposed OpenAI key is revoked in the provider dashboard.

## Risks / Follow-ups

- Hardcoded CORS origins can drift from production deployment domains.
- Service role fallback should be simplified after production env naming is finalized.
- Sentry env vars should be added when error monitoring is implemented.
