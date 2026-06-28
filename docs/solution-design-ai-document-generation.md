# Solution Design: AI Document Generation

## Jira

- Epic: KAN-25 - Implement Core Supabase Database Architecture for User, Storage, Billing, and AI Domains

## Problem / Goal

Users need AI-assisted resume enhancement and cover letter generation, but these features must be authenticated, plan-gated, rate-limited, and usage-metered. The goal is to document the current AI document generation flow.

## Scope

- Resume enhancement through `/api/generate-resume-enhancement`.
- Cover letter generation through `/api/generate-cover-letter`.
- Auth, CORS, and rate limiting.
- Feature entitlement checks.
- Resume file parsing.
- OpenAI-backed generation.
- Usage recording.

## Design

Resume enhancement:

1. Verify auth.
2. Check `resume_generate`.
3. Parse uploaded resume.
4. Optionally include job description.
5. Generate enhancement text.
6. Record usage.

Cover letter generation:

1. Verify auth.
2. Check `cover_letter_generate`.
3. Parse uploaded resume.
4. Validate job description, company name, and role title.
5. Generate cover letter.
6. Record usage.

Both routes enforce a 5MB resume limit and return stable validation errors.

## User Stories

### Generate Resume Enhancement

- Jira: KAN-25
- Who: As a paid JobScrape user.
- What: I want AI suggestions to improve my resume.
- Why: So that I can tailor my resume before applying.

### Generate Cover Letter

- Jira: KAN-25
- Who: As a paid JobScrape user.
- What: I want a cover letter generated from my resume and job details.
- Why: So that I can apply faster with a role-specific draft.

### Include Job Context

- Jira: KAN-25
- Who: As a user applying to a specific role.
- What: I want the generator to use the job description and role details.
- Why: So that generated content is relevant to the target job.

### Enforce AI Usage Limits

- Jira: KAN-25
- Who: As the JobScrape system.
- What: I want AI document generation gated and metered by subscription.
- Why: So that AI costs and plan limits remain controlled.

## Acceptance Criteria

- Authenticated entitled users can generate resume enhancements.
- Authenticated entitled users can generate cover letters.
- Invalid inputs return clear errors.
- Usage is recorded only after successful generation.
- Unauthorized or over-limit users are rejected.

## Risks / Follow-ups

- Generated content should be reviewed by users before use.
- Prompt quality and model selection may need iteration.
- Stored generated documents may need a future persistence design.
