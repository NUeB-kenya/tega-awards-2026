-- Drop and re-create all triggers to ensure they're correct
DROP TRIGGER IF EXISTS trg_compute_overall_score ON public.scores;
DROP TRIGGER IF EXISTS trg_audit_score ON public.scores;
DROP TRIGGER IF EXISTS trg_audit_submission ON public.submissions;

-- Recreate compute trigger
CREATE TRIGGER trg_compute_overall_score
BEFORE INSERT OR UPDATE ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.compute_overall_score();

-- Recreate audit triggers
CREATE TRIGGER trg_audit_score
AFTER INSERT OR UPDATE OR DELETE ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.audit_score_change();

CREATE TRIGGER trg_audit_submission
AFTER UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.audit_submission_change();