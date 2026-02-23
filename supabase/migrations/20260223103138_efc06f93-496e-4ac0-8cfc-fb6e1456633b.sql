
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('submitter', 'judge', 'secretariat');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  position TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create submissions table (matching nomination form)
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Nominator info
  nominator_name TEXT NOT NULL,
  nominator_email TEXT NOT NULL,
  nominator_phone TEXT,
  nominator_role TEXT,
  -- School info
  school_name TEXT NOT NULL,
  school_city TEXT NOT NULL,
  school_country TEXT NOT NULL,
  institution_type TEXT,
  institution_size TEXT,
  -- Award categories (up to 3)
  award_categories TEXT[] DEFAULT '{}',
  -- Nomination details
  nomination_statement TEXT NOT NULL,
  past_awards TEXT,
  communication_preference TEXT DEFAULT 'Email',
  -- Status
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'scored', 'shortlisted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  innovation_score INT CHECK (innovation_score >= 0 AND innovation_score <= 10),
  impact_score INT CHECK (impact_score >= 0 AND impact_score <= 10),
  scalability_score INT CHECK (scalability_score >= 0 AND scalability_score <= 10),
  sustainability_score INT CHECK (sustainability_score >= 0 AND sustainability_score <= 10),
  overall_score NUMERIC(4,2) GENERATED ALWAYS AS (
    (COALESCE(innovation_score, 0) + COALESCE(impact_score, 0) + COALESCE(scalability_score, 0) + COALESCE(sustainability_score, 0)) / 4.0
  ) STORED,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, judge_id)
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_submitter()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'submitter')
$$;

CREATE OR REPLACE FUNCTION public.is_judge()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'judge')
$$;

CREATE OR REPLACE FUNCTION public.is_secretariat()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'secretariat')
$$;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  -- Auto-assign submitter role unless already has a role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'submitter');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- user_roles: users can read their own role, secretariat can manage all
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.is_secretariat());
CREATE POLICY "Secretariat manages roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_secretariat());
CREATE POLICY "Secretariat updates roles" ON public.user_roles FOR UPDATE USING (public.is_secretariat());
CREATE POLICY "Secretariat deletes roles" ON public.user_roles FOR DELETE USING (public.is_secretariat());

-- profiles: own profile + secretariat sees all + judges see all profiles
CREATE POLICY "Users read own profile or secretariat/judge reads all" ON public.profiles FOR SELECT USING (user_id = auth.uid() OR public.is_secretariat() OR public.is_judge());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- submissions: submitter sees own, judge/secretariat sees all
CREATE POLICY "Submitter reads own submissions" ON public.submissions FOR SELECT USING (submitter_id = auth.uid() OR public.is_judge() OR public.is_secretariat());
CREATE POLICY "Submitter creates submissions" ON public.submissions FOR INSERT WITH CHECK (submitter_id = auth.uid() AND public.is_submitter());
CREATE POLICY "Submitter updates own submissions" ON public.submissions FOR UPDATE USING (submitter_id = auth.uid() OR public.is_secretariat());
CREATE POLICY "Secretariat deletes submissions" ON public.submissions FOR DELETE USING (public.is_secretariat());

-- scores: judge manages own, secretariat reads all
CREATE POLICY "Judge/secretariat reads scores" ON public.scores FOR SELECT USING (judge_id = auth.uid() OR public.is_secretariat());
CREATE POLICY "Judge creates scores" ON public.scores FOR INSERT WITH CHECK (judge_id = auth.uid() AND public.is_judge());
CREATE POLICY "Judge updates own scores" ON public.scores FOR UPDATE USING (judge_id = auth.uid() AND public.is_judge());
CREATE POLICY "Secretariat deletes scores" ON public.scores FOR DELETE USING (public.is_secretariat());
