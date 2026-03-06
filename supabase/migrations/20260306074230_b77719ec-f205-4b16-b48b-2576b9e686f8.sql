
-- 1. Add nomination_statements JSONB to submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS nomination_statements jsonb DEFAULT '{}'::jsonb;

-- 2. Add account_type to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'applicant';

-- 3. Create judge_applications table
CREATE TABLE IF NOT EXISTS public.judge_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_type text NOT NULL DEFAULT 'judge',
  full_name text NOT NULL,
  highest_education text,
  work_experience text,
  highest_position_held text,
  current_position text,
  current_organization text,
  years_in_education integer,
  areas_of_expertise text,
  why_judge text,
  cv_path text,
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.judge_applications ENABLE ROW LEVEL SECURITY;

-- RLS for judge_applications
CREATE POLICY "Users manage own judge applications"
  ON public.judge_applications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin/secretariat read all judge applications"
  ON public.judge_applications FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_secretariat());

CREATE POLICY "Admin/secretariat update judge applications"
  ON public.judge_applications FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_secretariat());

-- 4. Create platform_settings table for fee management
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin manages settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Insert default fee settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('submission_fee', '{"amount": 1, "currency": "KES"}'::jsonb),
  ('approval_fee', '{"amount": 0, "currency": "KES"}'::jsonb),
  ('exchange_rates', '{"USD_KES": 130, "EUR_KES": 142, "GBP_KES": 165, "ZAR_KES": 7.2, "NGN_KES": 0.085}'::jsonb),
  ('supported_currencies', '["KES", "USD", "EUR", "GBP", "ZAR"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Update handle_new_user to save account_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, country, phone, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'applicant')
  );
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'submitter');
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create trigger on auth.users for handle_new_user (recreate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
