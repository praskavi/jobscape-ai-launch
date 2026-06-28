# Solution Design: ATS Scoring Pipeline

## Jira

- Epic: KAN-5 - Pre ATS call - Rule Based Pre Scoring to avoid AI calls
- Related: KAN-39

## Problem / Goal

The ATS Checker needs a dependable scoring pipeline that can use either uploaded resumes or stored resume files, apply rule/semantic scoring, optionally request advanced AI recommendations, and record subscription usage only after successful analysis.

## Scope

- Authenticate ATS analysis requests.
- Enforce `ats_score` entitlement and usage.
- Accept either `resumeFileId` or uploaded `resume`.
- Validate file type and size.
- Extract resume text.
- Validate job description.
- Calculate semantic ATS score.
- Optionally call OpenAI for advanced recommendations.
- Record usage after success.

## Design

`POST /api/analyze-ats` receives multipart form data:

- `resumeFileId` for stored resume selection.
- `resume` for manual upload fallback.
- `jobDescription`.
- `fetchAdvancedAI` for optional AI recommendations.

The route resolves resume input in this order:

1. If `resumeFileId` is present, verify ownership through `user_profiles` and `user_files`.
2. Download the stored resume from Supabase Storage.
3. Otherwise parse the uploaded file.
4. Validate MIME type, extension, and size.
5. Extract text.
6. Calculate semantic score.
7. Run advanced AI only when explicitly requested.
8. Record `ats_score` usage after successful analysis.

## User Stories

### Score Resume Against Job Description

- Jira: KAN-5
- Who: As a JobScrape user.
- What: I want to score my resume against a job description.
- Why: So that I can understand how well my resume fits before applying.

### Use Stored Resume

- Jira: KAN-5
- Who: As a user with a saved resume.
- What: I want ATS Checker to use my stored resume.
- Why: So that I do not need to upload the same resume repeatedly.

### Upload Resume Manually

- Jira: KAN-5
- Who: As a user testing a new resume.
- What: I want to upload a resume directly to ATS Checker.
- Why: So that I can score a draft before saving it.

### Request Advanced AI Guidance

- Jira: KAN-5
- Who: As a user needing deeper feedback.
- What: I want optional AI recommendations after the base ATS score.
- Why: So that I can improve my resume with more specific guidance.

### Protect ATS Usage

- Jira: KAN-5
- Who: As the JobScrape system.
- What: I want ATS checks gated by plan and recorded after success.
- Why: So that usage limits are enforced fairly.

## Acceptance Criteria

- Stored resume and manual upload both work.
- Unknown or unowned `resumeFileId` is rejected.
- Invalid file type, size, or job description returns clear errors.
- Usage is recorded after successful scoring.
- Advanced AI runs only when requested.

## Risks / Follow-ups

- Very short or poorly parsed resumes may produce weak scoring.
- Advanced AI cost must remain controlled by explicit user action.
