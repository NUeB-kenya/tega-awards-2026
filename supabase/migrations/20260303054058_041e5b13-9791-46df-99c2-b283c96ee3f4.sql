-- Drop the generated column and recreate as regular column
ALTER TABLE public.scores DROP COLUMN IF EXISTS overall_score;
ALTER TABLE public.scores ADD COLUMN overall_score numeric;

-- Create trigger function to auto-compute overall_score
CREATE OR REPLACE FUNCTION public.compute_overall_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.overall_score := (
    (COALESCE(NEW.impact_score, 0)::numeric * 3.0) +
    (COALESCE(NEW.innovation_score, 0)::numeric * 1.5) +
    (COALESCE(NEW.scalability_score, 0)::numeric * 1.5) +
    (COALESCE(NEW.criterion_equity, 0)::numeric * 1.0) +
    (COALESCE(NEW.sustainability_score, 0)::numeric * 1.0) +
    (COALESCE(NEW.criterion_evidence, 0)::numeric * 1.0) +
    (COALESCE(NEW.criterion_ethics, 0)::numeric * 1.0)
  );
  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_compute_overall_score ON public.scores;
CREATE TRIGGER trg_compute_overall_score
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_overall_score();

-- Recalculate existing scores
UPDATE public.scores SET overall_score = (
  (COALESCE(impact_score, 0)::numeric * 3.0) +
  (COALESCE(innovation_score, 0)::numeric * 1.5) +
  (COALESCE(scalability_score, 0)::numeric * 1.5) +
  (COALESCE(criterion_equity, 0)::numeric * 1.0) +
  (COALESCE(sustainability_score, 0)::numeric * 1.0) +
  (COALESCE(criterion_evidence, 0)::numeric * 1.0) +
  (COALESCE(criterion_ethics, 0)::numeric * 1.0)
);

-- Also recreate the audit trigger for scores
DROP TRIGGER IF EXISTS trg_audit_score ON public.scores;
CREATE TRIGGER trg_audit_score
  AFTER INSERT OR UPDATE OR DELETE ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_score_change();

-- Recreate submission audit trigger
DROP TRIGGER IF EXISTS trg_audit_submission ON public.submissions;
CREATE TRIGGER trg_audit_submission
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_submission_change();