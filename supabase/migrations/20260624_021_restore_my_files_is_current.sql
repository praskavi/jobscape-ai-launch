-- ============================================================
-- Migration: 20260624_021_restore_my_files_is_current.sql
-- KAN-37 | Restore resume active flag on security-invoker my_files view
--
-- Context:
--   Migration 003 added user_files.is_current and exposed it through my_files.
--   Migration 020 recreated my_files with security_invoker=true for the
--   Supabase linter fix, but omitted is_current from the projection.
--
-- This forward migration keeps the security_invoker fix and restores the
-- is_current column expected by resume versioning and document UIs.
-- ============================================================

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

GRANT SELECT ON public.my_files TO authenticated;

COMMENT ON VIEW public.my_files IS
  'Current user file listing. Security invoker view filtered by auth.uid() and includes the active-resume is_current flag.';
