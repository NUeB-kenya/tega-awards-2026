
-- Add unique constraint: only one active judge assignment per submission
CREATE UNIQUE INDEX IF NOT EXISTS idx_judge_assignments_one_per_submission 
ON public.judge_assignments (submission_id) 
WHERE status IN ('in_progress', 'completed');
