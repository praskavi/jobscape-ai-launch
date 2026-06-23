# Solution Design: Configurable CORS Origins

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains
- Task: KAN-35 - Make API CORS origins configurable by environment
- Confluence roadmap: https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8585218/6-Week+Roadmap+Task+Tracker+Milestones

## Problem / Goal

API CORS allowlisted origins are currently hardcoded in source. This creates launch risk when pre-production or production domains change, and it forces a code deploy for configuration-only domain updates.

The goal is to make the CORS allowlist configurable via server-side environment variables while preserving safe defaults for local development and the current known production/pre-production domains.

## Current State

- `frontend/src/lib/cors.ts` contains a hardcoded `ALLOWED_ORIGINS` array.
- Localhost and `127.0.0.1` are allowed for local development.
- No CORS env var is documented in `frontend/.env.example`.

## Proposed Approach

- Add support for `CORS_ALLOWED_ORIGINS` as a comma-separated server-side env var.
- Keep existing hardcoded domains as fallback defaults.
- Continue allowing localhost and `127.0.0.1` for development.
- Document the variable in `frontend/.env.example` and the env audit design doc.

## Acceptance Criteria

- API CORS accepts configured origins from `CORS_ALLOWED_ORIGINS`.
- Existing known origins remain allowed when the env var is absent.
- Localhost development remains allowed.
- CORS secrets are not exposed with `NEXT_PUBLIC_`.
- `npm.cmd run lint` passes.
- `npm.cmd run build` passes.

## Verification

- Unit-level behavior is simple and covered by code review.
- Production build verifies the config path compiles.
- Pre-production smoke test should confirm allowed and rejected browser origins.

## Risks / Follow-ups

- Misconfigured origins can block browser API calls.
- Overly broad origins weaken browser-side API protection.
