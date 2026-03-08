-- Fix: Drop old unique constraint that prevents per-category scoring
ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_submission_id_judge_id_key;

-- Add new unique constraint that includes category_name
CREATE UNIQUE INDEX scores_submission_judge_category_key 
  ON public.scores (submission_id, judge_id, category_name);

-- Add the triggers that were missing
CREATE OR REPLACE TRIGGER trg_compute_overall_score
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.compute_overall_score();

CREATE OR REPLACE TRIGGER trg_audit_score_change
  AFTER INSERT OR UPDATE OR DELETE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.audit_score_change();

CREATE OR REPLACE TRIGGER trg_audit_submission_change
  AFTER UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_submission_change();