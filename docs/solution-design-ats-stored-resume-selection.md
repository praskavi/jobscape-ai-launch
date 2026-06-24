# ATS Stored Resume Selection

## Jira

- Ticket: KAN-39
- Epic: KAN-5

## Problem / Goal

The ATS Checker page requires a fresh resume upload even when the user already has resumes stored in Supabase. This creates duplicate work and bypasses the user's active resume selection.

## Scope

- Load stored resume records from `user_files` for the signed-in user.
- Select the active/current resume by default when one exists.
- Let users choose another stored resume.
- Keep manual file upload as a fallback.
- Update `/api/analyze-ats` to accept `resumeFileId` and download the stored file server-side after ownership verification.

## Design

The ATS page queries:

- `user_profiles.id` by `auth.uid()`
- `user_files` where `user_profile_id = profile.id` and `file_type = 'resume'`

The selected stored resume id is submitted as `resumeFileId` in the existing multipart request. Manual uploads still submit `resume`.

The ATS API resolves the resume in this order:

1. If `resumeFileId` is present, verify it belongs to the current user's `user_profiles` row.
2. Download `file_path` from its `bucket_name` in Supabase Storage using the server route client.
3. Parse the downloaded bytes using the stored MIME type and filename.
4. Otherwise, fall back to parsing the uploaded `resume` file.

## Acceptance Criteria

- Stored resumes appear on the ATS Checker page for authenticated users.
- The active resume is selected automatically.
- Selecting a stored resume and running ATS analysis works without re-uploading the file.
- Manual upload still works when no stored resume is available.
- The API rejects unknown or unowned `resumeFileId` values.

## Notes

- The API uses the service role key when available, matching other storage-backed API routes.
- ATS usage metering remains unchanged.
