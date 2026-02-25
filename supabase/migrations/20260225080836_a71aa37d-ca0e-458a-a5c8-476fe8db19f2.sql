
-- Categories table with specific IDs
CREATE TABLE IF NOT EXISTS public.categories (
  id integer PRIMARY KEY,
  name text NOT NULL UNIQUE,
  tier_type text NOT NULL DEFAULT 'layered' CHECK (tier_type IN ('layered', 'regional_global_only', 'global_only')),
  description text,
  requires_age_limit boolean NOT NULL DEFAULT false,
  requires_org_type boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/secretariat manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_secretariat() OR public.is_admin()) WITH CHECK (public.is_secretariat() OR public.is_admin());

-- Insert the 14 categories
INSERT INTO public.categories (id, name, tier_type, requires_age_limit, requires_org_type, description) VALUES
(1, 'Global Transformational School of the Year', 'global_only', false, true, 'Recognizes a school demonstrating transformative education practices with measurable global impact.'),
(2, 'Global Education Innovation of the Year', 'global_only', false, false, 'Honors the most innovative education initiative or model worldwide.'),
(3, 'Lifetime Contribution to Education Transformation', 'global_only', false, false, 'Celebrates an individual whose career has profoundly shaped education transformation.'),
(4, 'Global Transformational Educator of the Year', 'layered', false, false, 'Recognizes an educator demonstrating exceptional teaching and learning outcomes.'),
(5, 'Innovative School Leader / Principal of the Year', 'layered', false, false, 'Honors a school leader who has driven innovation and improved outcomes.'),
(6, 'Emerging Education Leader Award (Under 40)', 'layered', true, false, 'Celebrates a young leader under 40 making significant education impact.'),
(7, 'Education System Leadership Award', 'layered', false, false, 'Recognizes leadership in education policy, governance, or system-level reform.'),
(8, 'Most Innovative School Model (Public or Private)', 'layered', false, true, 'Honors a school with a uniquely innovative operational or pedagogical model.'),
(9, 'Rural & Underserved Communities Impact Award', 'regional_global_only', false, false, 'Recognizes initiatives with deep impact in rural or underserved communities.'),
(10, 'Inclusive & Equitable Learning Excellence Award', 'regional_global_only', false, false, 'Honors programs promoting equity, inclusion, and access in education.'),
(11, 'AI & Data Innovation in Education Award', 'regional_global_only', false, false, 'Celebrates innovative use of AI, data, and technology in education.'),
(12, 'Best EdTech Solution for Low-Resource Settings', 'layered', false, false, 'Recognizes technology solutions designed for resource-constrained environments.'),
(13, 'STEM & Future Skills Advancement Award', 'layered', false, false, 'Honors programs advancing STEM education and future-ready skills.'),
(14, 'Youth Education Changemaker Award', 'layered', true, false, 'Celebrates a young person driving education change through peer influence and initiative.');

-- Panels table
CREATE TABLE IF NOT EXISTS public.panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('national', 'regional', 'global')),
  country_id text,
  region_id text,
  category_id integer REFERENCES public.categories(id),
  chair_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read panels" ON public.panels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/secretariat manage panels" ON public.panels FOR ALL TO authenticated USING (public.is_secretariat() OR public.is_admin()) WITH CHECK (public.is_secretariat() OR public.is_admin());

-- Panel judges table
CREATE TABLE IF NOT EXISTS public.panel_judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid NOT NULL REFERENCES public.panels(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(panel_id, judge_id)
);

ALTER TABLE public.panel_judges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read panel_judges" ON public.panel_judges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/secretariat manage panel_judges" ON public.panel_judges FOR ALL TO authenticated USING (public.is_secretariat() OR public.is_admin()) WITH CHECK (public.is_secretariat() OR public.is_admin());

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'KES',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'waived')),
  transaction_reference text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = payments.submission_id AND s.submitter_id = auth.uid())
  OR public.is_secretariat() OR public.is_admin()
);
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = payments.submission_id AND s.submitter_id = auth.uid())
);
CREATE POLICY "Admin/secretariat manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_secretariat() OR public.is_admin()) WITH CHECK (public.is_secretariat() OR public.is_admin());

-- Conflict declarations table
CREATE TABLE IF NOT EXISTS public.conflict_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id uuid NOT NULL,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  conflict_reason text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(judge_id, submission_id)
);

ALTER TABLE public.conflict_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Judges manage own COI" ON public.conflict_declarations FOR ALL TO authenticated USING (judge_id = auth.uid() AND public.is_judge()) WITH CHECK (judge_id = auth.uid() AND public.is_judge());
CREATE POLICY "Secretariat reads all COI" ON public.conflict_declarations FOR SELECT TO authenticated USING (public.is_secretariat() OR public.is_admin());

-- Evidence files table
CREATE TABLE IF NOT EXISTS public.evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  file_type text NOT NULL CHECK (file_type IN ('narrative', 'outcomes_data', 'references_doc', 'safeguarding_statement', 'financial_report', 'media_link')),
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants manage own evidence" ON public.evidence_files FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = evidence_files.submission_id AND s.submitter_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = evidence_files.submission_id AND s.submitter_id = auth.uid())
);
CREATE POLICY "Judges/secretariat read evidence" ON public.evidence_files FOR SELECT TO authenticated USING (public.is_judge() OR public.is_secretariat() OR public.is_admin());

-- Audit logs table (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Only insert, no update/delete (append-only)
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin/secretariat read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_secretariat() OR public.is_admin());

-- Add new columns to submissions table
ALTER TABLE public.submissions 
  ADD COLUMN IF NOT EXISTS category_id integer REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'national' CHECK (stage IN ('national', 'regional', 'global')),
  ADD COLUMN IF NOT EXISTS average_score numeric;

-- Add new columns to scores table for the expanded rubric
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS criterion_equity integer,
  ADD COLUMN IF NOT EXISTS criterion_evidence integer,
  ADD COLUMN IF NOT EXISTS criterion_ethics integer;

-- Enable realtime for audit_logs and payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
