# Solution Design: Job Search API

## Jira

- Epic: KAN-4 - APIs, scraping, and job data collection

## Problem / Goal

JobScrape needs a reliable job matching API that uses a user's saved resume, searches stored job embeddings, applies semantic scoring, and returns plan-appropriate recommendations. The goal is to document the current `/api/find-jobs` flow and its dependencies.

## Scope

- Authenticate API requests.
- Enforce `ai_job_match` subscription access and usage.
- Load the user's saved resume.
- Extract resume text and generate embeddings.
- Search matching jobs through Supabase RPCs.
- Score and rank matches.
- Cache the latest AI job match run.

## Design

`POST /api/find-jobs` accepts optional `jobTitle` and `location` form fields. The route:

1. Handles CORS and rate limiting.
2. Verifies the Supabase user.
3. Checks `ai_job_match` feature access.
4. Loads the user's latest saved resume from `user_files`.
5. Downloads the resume from Supabase Storage.
6. Extracts resume text.
7. Generates embeddings through Hugging Face.
8. Calls `match_jobs` for resume chunks.
9. Scores shortlisted jobs using semantic ATS scoring.
10. Stores results in `ai_job_match_runs`.
11. Records feature usage.

`GET /api/find-jobs` returns the latest cached run and saved resume metadata.

## User Stories

### Run AI Job Match

- Jira: KAN-4
- Who: As a Basic or Premium user.
- What: I want to find jobs matched against my saved resume.
- Why: So that I can focus on roles where my resume is a stronger fit.

### Filter Job Matches

- Jira: KAN-4
- Who: As a job seeker.
- What: I want to optionally filter matches by job title and location.
- Why: So that recommendations match my target role and geography.

### Reuse Saved Resume

- Jira: KAN-4
- Who: As a user with a stored resume.
- What: I want job matching to use my saved resume without re-uploading it.
- Why: So that job search is faster and consistent with my active profile.

### Enforce Plan Limits

- Jira: KAN-4
- Who: As the JobScrape system.
- What: I want AI job matching gated by subscription plan and usage.
- Why: So that paid AI workloads are controlled and monetized correctly.

### Cache Latest Results

- Jira: KAN-4
- Who: As a returning user.
- What: I want my latest job match results available without rerunning the analysis.
- Why: So that I can resume reviewing recommendations quickly.

## Acceptance Criteria

- Authenticated users can run job matching when entitled.
- Unauthorized or over-limit users receive stable error responses.
- Matching uses stored resume text.
- Basic and Premium users receive plan-appropriate result counts.
- Latest match run is cached.
- Usage is recorded after successful runs.

## Risks / Follow-ups

- Hugging Face failures should degrade with clear errors.
- Resume extraction failures should prompt the user to upload a better file.
- Job ingestion quality directly affects match quality.
