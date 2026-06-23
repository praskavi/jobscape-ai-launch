-- Persist AI Job Match results so users can reload their latest computed matches
-- without re-running vector search and ATS scoring on every page visit.

CREATE TABLE IF NOT EXISTS public.ai_job_match_runs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_profile_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    resume_hash text NOT NULL,
    job_title text,
    location text,
    result_count integer NOT NULL DEFAULT 0,
    matches jsonb NOT NULL DEFAULT '[]'::jsonb,
    scoring_version text NOT NULL DEFAULT 'semantic-ats-v2',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_job_match_runs_user_created
    ON public.ai_job_match_runs(user_id, created_at DESC);

ALTER TABLE public.ai_job_match_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ai job match runs" ON public.ai_job_match_runs;
CREATE POLICY "Users can read own ai job match runs"
    ON public.ai_job_match_runs FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai job match runs" ON public.ai_job_match_runs;
CREATE POLICY "Users can insert own ai job match runs"
    ON public.ai_job_match_runs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON TABLE public.ai_job_match_runs TO authenticated;
GRANT ALL ON TABLE public.ai_job_match_runs TO service_role;
