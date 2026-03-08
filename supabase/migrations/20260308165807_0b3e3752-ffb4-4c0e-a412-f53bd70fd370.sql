ALTER TABLE public.submissions DROP CONSTRAINT submissions_stage_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_stage_check CHECK (stage = ANY (ARRAY['national'::text, 'continental'::text, 'regional'::text, 'global'::text]));

ALTER TABLE public.submissions DROP CONSTRAINT submissions_status_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'paid'::text, 'under_review'::text, 'screened'::text, 'assigned'::text, 'scored'::text, 'shortlisted'::text, 'finalist'::text, 'winner'::text, 'rejected'::text, 'disqualified'::text]));