-- ============================================================
-- Migration: 20260624_020_fix_linter_security_findings.sql
-- KAN-38 | Supabase linter security fixes
--
-- Fixes:
--   1. security_definer_view_public_my_files
--   2. rls_disabled_in_public_public_job_chunks
-- ============================================================

-- Recreate my_files as a security invoker view so permissions and RLS
-- are evaluated as the querying user instead of the view owner.
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
    uf.created_at,
    uf.updated_at
  FROM public.user_files uf
  JOIN public.user_profiles up ON up.id = uf.user_profile_id
  WHERE up.user_id = auth.uid();

GRANT SELECT ON public.my_files TO authenticated;

-- job_chunks supports job embedding/vector search. It lives in the exposed
-- public schema, so RLS must be explicit. Client roles get read-only access
-- to chunks for jobs that are readable under the jobs table policies.
ALTER TABLE public.job_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read chunks for readable jobs" ON public.job_chunks;
CREATE POLICY "Anon can read chunks for readable jobs"
  ON public.job_chunks
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = job_chunks.job_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read chunks for readable jobs" ON public.job_chunks;
CREATE POLICY "Authenticated users can read chunks for readable jobs"
  ON public.job_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = job_chunks.job_id
    )
  );

COMMENT ON VIEW public.my_files IS
  'Current user file listing. Security invoker view filtered by auth.uid().';

COMMENT ON TABLE public.job_chunks IS
  'Embedding chunks for jobs. RLS enabled; client roles are read-only and writes are reserved for service-role ingestion workflows.';
