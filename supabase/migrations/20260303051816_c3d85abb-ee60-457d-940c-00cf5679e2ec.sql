
-- Fix the overall_score generated column to use the correct weighted rubric formula
ALTER TABLE public.scores DROP COLUMN overall_score;
ALTER TABLE public.scores ADD COLUMN overall_score numeric GENERATED ALWAYS AS (
  (COALESCE(impact_score, 0) * 3.0) + 
  (COALESCE(innovation_score, 0) * 1.5) + 
  (COALESCE(scalability_score, 0) * 1.5) + 
  (COALESCE(criterion_equity, 0) * 1.0) + 
  (COALESCE(sustainability_score, 0) * 1.0) + 
  (COALESCE(criterion_evidence, 0) * 1.0) + 
  (COALESCE(criterion_ethics, 0) * 1.0)
) STORED;
