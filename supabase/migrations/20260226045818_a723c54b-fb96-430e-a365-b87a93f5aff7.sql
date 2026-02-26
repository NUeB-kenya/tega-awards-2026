
-- Add screening_notes and screening columns to submissions
ALTER TABLE public.submissions 
  ADD COLUMN IF NOT EXISTS screening_notes text,
  ADD COLUMN IF NOT EXISTS screened_by uuid,
  ADD COLUMN IF NOT EXISTS screened_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_submission_id uuid REFERENCES public.submissions(id),
  ADD COLUMN IF NOT EXISTS promoted_from_stage text;

-- Add country_id and region_id columns if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='country_id') THEN
    ALTER TABLE public.submissions ADD COLUMN country_id text;
  END IF;
END $$;

-- Create regions table
CREATE TABLE IF NOT EXISTS public.regions (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create countries table  
CREATE TABLE IF NOT EXISTS public.countries (
  id text PRIMARY KEY,
  name text NOT NULL,
  region_id text REFERENCES public.regions(id),
  phone_code text,
  flag_emoji text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed 6 regions
INSERT INTO public.regions (id, name) VALUES
  ('east_africa', 'East Africa'),
  ('west_africa', 'West Africa'),
  ('southern_africa', 'Southern Africa'),
  ('north_africa', 'North Africa'),
  ('central_africa', 'Central Africa'),
  ('global', 'Global')
ON CONFLICT (id) DO NOTHING;

-- Seed 20 countries with regions and phone codes
INSERT INTO public.countries (id, name, region_id, phone_code, flag_emoji) VALUES
  ('KE', 'Kenya', 'east_africa', '+254', '🇰🇪'),
  ('UG', 'Uganda', 'east_africa', '+256', '🇺🇬'),
  ('TZ', 'Tanzania', 'east_africa', '+255', '🇹🇿'),
  ('RW', 'Rwanda', 'east_africa', '+250', '🇷🇼'),
  ('ET', 'Ethiopia', 'east_africa', '+251', '🇪🇹'),
  ('NG', 'Nigeria', 'west_africa', '+234', '🇳🇬'),
  ('GH', 'Ghana', 'west_africa', '+233', '🇬🇭'),
  ('SN', 'Senegal', 'west_africa', '+221', '🇸🇳'),
  ('CI', 'Côte d''Ivoire', 'west_africa', '+225', '🇨🇮'),
  ('ZA', 'South Africa', 'southern_africa', '+27', '🇿🇦'),
  ('BW', 'Botswana', 'southern_africa', '+267', '🇧🇼'),
  ('ZM', 'Zambia', 'southern_africa', '+260', '🇿🇲'),
  ('ZW', 'Zimbabwe', 'southern_africa', '+263', '🇿🇼'),
  ('MW', 'Malawi', 'southern_africa', '+265', '🇲🇼'),
  ('EG', 'Egypt', 'north_africa', '+20', '🇪🇬'),
  ('MA', 'Morocco', 'north_africa', '+212', '🇲🇦'),
  ('TN', 'Tunisia', 'north_africa', '+216', '🇹🇳'),
  ('CD', 'DR Congo', 'central_africa', '+243', '🇨🇩'),
  ('CM', 'Cameroon', 'central_africa', '+237', '🇨🇲'),
  ('GA', 'Gabon', 'central_africa', '+241', '🇬🇦')
ON CONFLICT (id) DO NOTHING;

-- Update categories with proper data (upsert)
DELETE FROM public.categories WHERE id <= 14;
INSERT INTO public.categories (id, name, tier_type, description, requires_age_limit, requires_org_type) VALUES
  (1, 'Global Transformational School of the Year', 'global_only', 'Recognizes schools demonstrating exceptional transformation in education delivery, outcomes, and community impact at a global level.', false, true),
  (2, 'Global Education Innovation of the Year', 'global_only', 'Celebrates the most impactful and original education innovation that addresses real-world learning challenges.', false, false),
  (3, 'Lifetime Contribution to Education Transformation', 'global_only', 'Honours an individual whose career-long dedication has fundamentally advanced education transformation.', false, false),
  (4, 'Global Transformational Educator of the Year', 'layered', 'Recognizes an outstanding educator whose teaching methods have produced measurable improvements in student outcomes.', false, false),
  (5, 'Innovative School Leader / Principal of the Year', 'layered', 'Celebrates school leaders who have driven institutional change through innovative management and pedagogy.', false, false),
  (6, 'Emerging Education Leader Award (Under 40)', 'layered', 'Spotlights young leaders under 40 making significant impact in education transformation.', true, false),
  (7, 'Education System Leadership Award', 'layered', 'Recognizes system-level leaders (ministry, district, network) driving education reform at scale.', false, false),
  (8, 'Most Innovative School Model (Public or Private)', 'layered', 'Highlights schools with novel operational models that improve learning outcomes and efficiency.', false, true),
  (9, 'Rural & Underserved Communities Impact Award', 'layered', 'Celebrates initiatives delivering transformative education in rural and underserved settings.', false, false),
  (10, 'Inclusive & Equitable Learning Excellence Award', 'layered', 'Recognizes programs that ensure equitable access to quality education for all learners.', false, false),
  (11, 'AI & Data Innovation in Education Award', 'regional_global_only', 'Celebrates responsible and effective use of AI and data analytics to improve education outcomes.', false, false),
  (12, 'Best EdTech Solution for Low-Resource Settings', 'regional_global_only', 'Recognizes technology solutions designed for and proven in low-resource educational environments.', false, false),
  (13, 'STEM & Future Skills Advancement Award', 'regional_global_only', 'Highlights initiatives advancing STEM education and future-ready skills development.', false, false),
  (14, 'Youth Education Changemaker Award', 'layered', 'Celebrates young people leading education change initiatives in their communities.', true, false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tier_type = EXCLUDED.tier_type, description = EXCLUDED.description, requires_age_limit = EXCLUDED.requires_age_limit, requires_org_type = EXCLUDED.requires_org_type;

-- Add panel name column
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS name text;

-- RLS for regions and countries (public read)
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read regions" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read countries" ON public.countries FOR SELECT TO authenticated USING (true);

-- Audit log function for automatic tracking
CREATE OR REPLACE FUNCTION public.log_audit(
  _user_id uuid,
  _action_type text,
  _entity_type text,
  _entity_id text DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, metadata_json)
  VALUES (_user_id, _action_type, _entity_type, _entity_id, _metadata);
END;
$$;

-- Trigger to auto-log score changes
CREATE OR REPLACE FUNCTION public.audit_score_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, metadata_json)
  VALUES (
    COALESCE(NEW.judge_id, OLD.judge_id),
    CASE WHEN TG_OP = 'INSERT' THEN 'score_created' WHEN TG_OP = 'UPDATE' THEN 'score_updated' ELSE 'score_deleted' END,
    'score',
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'submission_id', COALESCE(NEW.submission_id, OLD.submission_id),
      'overall_score', COALESCE(NEW.overall_score, OLD.overall_score),
      'operation', TG_OP
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_scores ON public.scores;
CREATE TRIGGER trg_audit_scores
  AFTER INSERT OR UPDATE OR DELETE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.audit_score_change();

-- Trigger to auto-log submission state changes
CREATE OR REPLACE FUNCTION public.audit_submission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, metadata_json)
    VALUES (
      NEW.submitter_id,
      'submission_status_change',
      'submission',
      NEW.id::text,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'stage', NEW.stage)
    );
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, metadata_json)
    VALUES (
      NEW.submitter_id,
      'submission_approval_change',
      'submission',
      NEW.id::text,
      jsonb_build_object('old_approval', OLD.approval_status, 'new_approval', NEW.approval_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_submissions ON public.submissions;
CREATE TRIGGER trg_audit_submissions
  AFTER UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_submission_change();
