# Solution Design: Authentication Flow

## Jira

- Epic: KAN-11 - Phase 1 Supabase Front End Setup for User Registration/Signup/Login, Routes, Components

## Problem / Goal

JobScrape needs a clear authentication design for registration, login, OAuth callback handling, password reset, protected routes, and user profile creation. The goal is to document how Supabase Auth supports app access and profile state.

## Scope

- Email/password signup.
- Email/password login.
- OAuth login callback.
- Password reset and recovery redirect.
- Protected route redirects.
- Supabase session handling through SSR/browser clients.
- User profile fallback creation.

## Design

Registration:

- Users submit name, email, and password.
- Supabase Auth creates the account.
- `full_name` is stored in auth metadata.
- User is asked to confirm email.

Login:

- Users sign in with email and password.
- Supabase browser client creates a session.
- App redirects to `/dashboard`.

OAuth callback:

- `/auth/callback` exchanges Supabase auth code for a session.
- Recovery links route to `/reset-password`.
- Normal login routes to `/dashboard`.
- The callback attempts fallback profile creation when needed.

Protected routes:

- Middleware checks user session.
- Protected pages redirect unauthenticated users to `/login`.

## User Stories

### Create Account

- Jira: KAN-11
- Who: As a new JobScrape visitor.
- What: I want to sign up with my name, email, and password.
- Why: So that I can save resumes, run analysis, and access personalized features.

### Log In

- Jira: KAN-11
- Who: As a returning JobScrape user.
- What: I want to log in with my email and password.
- Why: So that I can access my dashboard and saved data.

### Recover Password

- Jira: KAN-11
- Who: As a user who forgot my password.
- What: I want to request a reset and set a new password.
- Why: So that I can regain account access securely.

### Protect Private Pages

- Jira: KAN-11
- Who: As the JobScrape system.
- What: I want unauthenticated users redirected away from private pages.
- Why: So that dashboards, documents, settings, and subscriptions are only visible to signed-in users.

### Maintain Profile Data

- Jira: KAN-11
- Who: As the JobScrape system.
- What: I want a user profile row available for authenticated users.
- Why: So that storage, documents, settings, and personalization can link to app profile data.

## Acceptance Criteria

- Users can register and log in.
- Auth callback exchanges session codes correctly.
- Password recovery links route to the reset flow.
- Protected routes redirect unauthenticated users.
- Profile fallback does not block successful login.

## Risks / Follow-ups

- Twitter auth is currently a placeholder.
- Profile fallback references should stay aligned with the canonical `user_profiles` table.
- Email confirmation behavior should be validated in pre-production.
