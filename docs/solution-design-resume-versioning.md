# Solution Design: Resume Versioning with Plan-Based Storage Limits

## Jira

- **Task:** KAN-37 — Implement resume versioning with plan-based storage limits (Free/Basic=1, Premium=3)
- **Epic:** KAN-25 — Supabase database, storage, billing, AI domains
- **Confluence Roadmap:** https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8585218/6-Week+Roadmap+Task+Tracker+Milestones
- **Confluence DB Schema:** https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8617986/Database+Schema+Assessment+amp+Migration+Plan+MVP1
- **Entitlement Matrix:** https://jobscrapper.atlassian.net/wiki/spaces/JO/pages/8716292/Subscription+Plans+Entitlements+and+Data+Architecture+Team+Alignment

---

## Problem / Goal

Two separate issues need resolving together:

**1. Migration 003 is incomplete.** `20260529_003_fix_user_files_versioning.sql` contains only the `my_files` view refresh. The schema changes it references ("is_current is added above") were never written. Without this migration:
- The `one_file_per_user_per_type` UNIQUE constraint is still live, preventing any user from ever uploading a second resume.
- The `is_current` column does not exist, so the view in the file would fail with `column uf.is_current does not exist` if deployed.

**2. `resume_upload` uses the wrong entitlement model.** The feature has `usage_period = 'monthly'` in `plan_features`. The 1/1/3 limit is a concurrent stored-count cap, not a monthly rate limit. Using `increment_usage` would let the stored count drift out of sync with the plan limits after every monthly reset.

---

## Business Rules

Per the Feature Entitlement Matrix (Confluence page above):

| Plan | Max stored resumes | Active for ATS/matching |
|------|--------------------|------------------------|
| Free | 1 | 1 (the only one) |
| Basic | 1 | 1 (the only one) |
| Premium | 3 | 1 (user-selectable) |

- Uploads are **not** rate-limited by month. Any plan can upload as many times as they want.
- Free/Basic: uploading when at limit (1) auto-replaces the existing resume (delete from storage + DB, insert new).
- Premium: uploading when at limit (3) returns an error — user must delete one first.
- Premium users select which stored resume is active via a Set Active action.
- `is_current = true` is the single active resume used by `/api/find-jobs`, `/api/analyze-ats`, and premium recommendations.

---

## Architecture Note: Why Not Use `increment_usage`?

`increment_usage` and `can_use_feature` are designed for **monthly rate limits** (ATS checks, AI job match runs, etc.). They insert/update a row in `subscription_usage` keyed by `(user_id, feature_id, period_start, period_end)` and reset on the 1st of each month.

For `resume_upload`, the limit is a **concurrent stored count** — it must reflect what's actually in `user_files` at all times. If `increment_usage` were used:
- A Free user could accumulate N resumes over N months (one per monthly cycle).
- Deleting a resume would require a `decrement_usage` RPC (doesn't exist, would be complex to add safely).
- The `subscription_usage` counter could diverge from the real `user_files` count after any manual DB operation or failed upload cleanup.

**Correct approach:** Check `COUNT(*) FROM user_files WHERE user_profile_id = X AND file_type = 'resume'` directly at upload time, and compare against `plan_features.usage_limit` for `resume_upload`.

The `usage_period` for `resume_upload` in `plan_features` is corrected from `'monthly'` to `'lifetime'` in Migration 019 to signal this semantic difference to future developers and the frontend's `PlanUsageSummary` component.

---

## Database Changes

### Migration 003 — `20260529_003_fix_user_files_versioning.sql` (complete rewrite)

```sql
-- 1. Add is_current column
ALTER TABLE public.user_files
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

-- 2. Backfill: for any user who already has resumes, mark the most recent as current
UPDATE public.user_files uf
SET is_current = (
  uf.id = (
    SELECT id FROM public.user_files
    WHERE user_profile_id = uf.user_profile_id
      AND file_type = uf.file_type
    ORDER BY created_at DESC
    LIMIT 1
  )
);

-- 3. Drop the old global unique constraint
ALTER TABLE public.user_files
  DROP CONSTRAINT IF EXISTS one_file_per_user_per_type;

-- 4. Partial unique index: only one active resume per user per file_type
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_files_current_per_type
  ON public.user_files (user_profile_id, file_type)
  WHERE is_current = true;

-- 5. Refresh my_files view to include is_current
CREATE OR REPLACE VIEW public.my_files AS
  SELECT
    uf.id,
    uf.user_profile_id,
    up.user_id AS auth_user_id,
    uf.file_type,
    uf.file_name,
    uf.file_path,
    uf.bucket_name,
    uf.mime_type,
    uf.file_size_bytes,
    uf.is_current,
    uf.created_at,
    uf.updated_at
  FROM public.user_files uf
  JOIN public.user_profiles up ON up.id = uf.user_profile_id
  WHERE up.user_id = auth.uid();

GRANT SELECT ON public.my_files TO authenticated;
```

### Migration 019 — `20260623_019_fix_resume_upload_usage_period.sql`

```sql
UPDATE public.plan_features pf
SET usage_period = 'lifetime'
FROM public.subscription_features sf
WHERE sf.id = pf.feature_id
  AND sf.feature_code = 'resume_upload';
```

### Migration 021 — `20260624_021_restore_my_files_is_current.sql`

Migration 020 fixed the Supabase `security_definer_view` linter finding by recreating `public.my_files` as a `security_invoker` view. That forward migration accidentally omitted `uf.is_current` from the view projection.

Migration 021 restores the active-resume flag while keeping `security_invoker = true`:

```sql
CREATE OR REPLACE VIEW public.my_files
WITH (security_invoker = true)
AS
  SELECT
    uf.id,
    uf.user_profile_id,
    up.user_id AS auth_user_id,
    uf.file_type,
    uf.file_name,
    uf.file_path,
    uf.bucket_name,
    uf.mime_type,
    uf.file_size_bytes,
    uf.is_current,
    uf.created_at,
    uf.updated_at
  FROM public.user_files uf
  JOIN public.user_profiles up ON up.id = uf.user_profile_id
  WHERE up.user_id = auth.uid();
```

---

## API Changes

### `/api/upload-resume` (POST) — updated logic

```
1. CORS + rate limit + JWT auth (unchanged)
2. Fetch user's auth_user_id from verifyApiUser
3. Fetch user_profile_id from user_profiles
4. Fetch plan tier + resume_upload usage_limit from plan_features
5. COUNT current resumes in user_files for this user
6. Apply plan rule:
   ├── Free/Basic (limit = 1):
   │     count == 1 → delete old file from storage + delete DB row
   │     count == 0 → proceed directly
   │     Insert new resume with is_current = true
   └── Premium (limit = 3):
         count == 3 → return 402 "Resume library full. Delete a resume to upload a new one."
         count < 3  → set all existing resumes is_current = false
                       Insert new resume with is_current = true
7. Return uploaded file metadata (unchanged shape)
```

`increment_usage('resume_upload')` is **removed**. `can_use_feature('resume_upload')` is **removed**. Both are replaced by the direct count check.

### `/api/resume/[id]/set-active` (PATCH) — new

Premium-only endpoint.

```
1. CORS + JWT auth
2. Verify plan is premium (can_use_feature check or direct plan_code check)
3. Verify user owns the resume (SELECT from user_files WHERE id = :id AND user_profile_id = :userProfileId)
4. In a transaction:
   UPDATE user_files SET is_current = false
     WHERE user_profile_id = :userProfileId AND file_type = 'resume'
   UPDATE user_files SET is_current = true
     WHERE id = :resumeId
5. Return { success: true, active_resume_id: resumeId }
```

---

## Frontend Changes

### `DocumentSection` / `DashboardPage` — no change

The existing `DocumentSection` component handles the single-resume case for Free/Basic. No changes needed.

### Documents page — Premium resume library

New `ResumeLibrary` component (Premium plan only), shown in place of the single `DocumentSection` for resumes when `planCode === 'premium'`.

```
┌─────────────────────────────────────────────────┐
│ Resumes  2 of 3 stored          [+ Upload new]  │
├─────────────────────────────────────────────────┤
│ 📄 resume_senior_dev.pdf        Jun 23          │
│    ✅ Active for matching        [Delete]        │
├─────────────────────────────────────────────────┤
│ 📄 resume_general.pdf           Jun 10          │
│    [Set Active]                  [Delete]        │
└─────────────────────────────────────────────────┘
```

- "Set Active" calls `PATCH /api/resume/[id]/set-active`
- On success, optimistically updates local state (swap Active badge)
- Upload button hidden when count == 3 (replaced by "Resume library full" message)

---

## Security Considerations

- `set-active` must verify ownership server-side (RLS + explicit `user_profile_id` check) — not trusting the client to only send their own resume IDs.
- Free/Basic auto-replace deletes the old storage object before inserting the new DB row. If storage delete fails, the upload is aborted (no orphan DB rows).
- The partial unique index on `(user_profile_id, file_type) WHERE is_current = true` is enforced at the DB level. Even if the API has a bug and sets two resumes active, Postgres will reject the second update with a unique violation.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260529_003_fix_user_files_versioning.sql` | Rewrite — add full migration body |
| `supabase/migrations/20260623_019_fix_resume_upload_usage_period.sql` | New |
| `frontend/src/app/api/upload-resume/route.ts` | Plan-aware count logic, remove increment_usage |
| `frontend/src/app/api/resume/[id]/set-active/route.ts` | New |
| `frontend/src/components/dashboard/DocumentSection.tsx` | Premium: render ResumeLibrary instead of single card |
| `frontend/src/components/dashboard/ResumeLibrary.tsx` | New — premium multi-resume UI |
| `SCHEMA_STATUS.md` | Update migration log + user_files table docs |

---

## User Stories

### Replace Resume On Free Or Basic

- Jira: KAN-25
- Who: As a Free or Basic JobScrape user.
- What: I want uploading a new resume to replace my existing stored resume automatically.
- Why: So that I can keep one current resume without manually cleaning up old files.

### Store Multiple Resumes On Premium

- Jira: KAN-25
- Who: As a Premium JobScrape user.
- What: I want to store up to three resume versions.
- Why: So that I can keep tailored resumes for different job types.

### Choose Active Resume

- Jira: KAN-25
- Who: As a Premium user with multiple resumes.
- What: I want to mark one resume as active.
- Why: So that ATS checks, job matching, and recommendations use the resume I intend.

### Prevent Resume Library Overflow

- Jira: KAN-25
- Who: As a Premium user at the resume storage limit.
- What: I want the app to block a fourth resume upload and tell me to delete one first.
- Why: So that storage limits remain predictable and aligned with plan entitlements.

### Enforce One Active Resume

- Jira: KAN-25
- Who: As the JobScrape system.
- What: I want the database to enforce only one active resume per user.
- Why: So that downstream ATS, matching, and recommendation workflows always have one clear resume source.

### Avoid Monthly Usage Drift

- Jira: KAN-25
- Who: As the JobScrape system.
- What: I want resume upload limits checked against stored resume count rather than monthly usage counters.
- Why: So that resume storage rules match actual files and do not reset incorrectly each month.

---

## Verification

- `npm run lint` — no errors
- `npm run build` — clean build
- Manual: Free user uploads resume twice → second upload replaces first, only 1 row in user_files
- Manual: Premium user uploads 3 resumes → 4th upload returns 402
- Manual: Premium user clicks Set Active on resume 2 → is_current flips, find-jobs uses resume 2
- DB check: `SELECT * FROM user_files WHERE file_type = 'resume'` — never more than 1 row with is_current = true per user
