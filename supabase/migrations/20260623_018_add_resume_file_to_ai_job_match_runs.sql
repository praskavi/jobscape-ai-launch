-- Link cached AI Job Match runs back to the saved resume used for scoring.

ALTER TABLE public.ai_job_match_runs
    ADD COLUMN IF NOT EXISTS resume_file_id uuid REFERENCES public.user_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_job_match_runs_resume_file
    ON public.ai_job_match_runs(resume_file_id);
