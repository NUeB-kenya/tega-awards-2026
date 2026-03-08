-- Add category_name to scores to support per-category scoring
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS category_name text;

-- Add expertise_categories and coi fields to judge_applications
ALTER TABLE public.judge_applications ADD COLUMN IF NOT EXISTS expertise_categories text[] DEFAULT '{}';
ALTER TABLE public.judge_applications ADD COLUMN IF NOT EXISTS has_coi boolean DEFAULT false;
ALTER TABLE public.judge_applications ADD COLUMN IF NOT EXISTS coi_document_path text;
ALTER TABLE public.judge_applications ADD COLUMN IF NOT EXISTS coi_description text;

-- Add sequential application_number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_number integer;

-- Create a sequence starting at 235
CREATE SEQUENCE IF NOT EXISTS application_number_seq START WITH 235;

-- Update profiles application_number default
ALTER TABLE public.profiles ALTER COLUMN application_number SET DEFAULT nextval('application_number_seq');

-- Update existing profiles that don't have application numbers
UPDATE public.profiles SET application_number = nextval('application_number_seq') WHERE application_number IS NULL;

-- Ranking tables
CREATE TABLE IF NOT EXISTS public.application_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  category_id integer REFERENCES public.categories(id),
  country_id text,
  region_id text,
  continent text,
  final_score numeric DEFAULT 0,
  country_rank integer,
  regional_rank integer,
  continental_rank integer,
  global_rank integer,
  tier_level text DEFAULT 'unranked',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, category_id)
);

ALTER TABLE public.application_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin_secretariat_manage_rankings" ON public.application_rankings
  FOR ALL USING (is_secretariat() OR is_admin())
  WITH CHECK (is_secretariat() OR is_admin());

CREATE POLICY "Authenticated_read_rankings" ON public.application_rankings
  FOR SELECT USING (true);