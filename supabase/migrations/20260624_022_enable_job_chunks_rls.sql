-- ============================================================
-- Migration: 20260624_022_enable_job_chunks_rls.sql
-- KAN-38 | Enable RLS on public.job_chunks
--
-- Context:
--   The Supabase security advisor reported:
--   rls_disabled_in_public_public_job_chunks
--
-- This migration applies the job_chunks half of the linter fix in a
-- standalone forward migration so it can be safely executed without
-- changing public.my_files again.
-- ============================================================

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

COMMENT ON TABLE public.job_chunks IS
  'Embedding chunks for jobs. RLS enabled; client roles are read-only and writes are reserved for service-role ingestion workflows.';
