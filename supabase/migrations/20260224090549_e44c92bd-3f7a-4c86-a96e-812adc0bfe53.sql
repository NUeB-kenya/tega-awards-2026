
-- 2. Update submissions table
ALTER TABLE public.submissions 
  ADD COLUMN IF NOT EXISTS submission_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- 3. Create submission_documents table
CREATE TABLE public.submission_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  category text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.submission_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants manage own docs" ON public.submission_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.submitter_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.submitter_id = auth.uid())
  );

CREATE POLICY "Judges read assigned docs" ON public.submission_documents
  FOR SELECT USING (is_judge() OR is_secretariat() OR public.has_role(auth.uid(), 'admin'));

-- 4. Create judge_assignments table
CREATE TABLE public.judge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id uuid NOT NULL,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(judge_id, submission_id)
);
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Judges manage own assignments" ON public.judge_assignments
  FOR ALL USING (judge_id = auth.uid() AND is_judge())
  WITH CHECK (judge_id = auth.uid() AND is_judge());

CREATE POLICY "Secretariat/admin read assignments" ON public.judge_assignments
  FOR SELECT USING (is_secretariat() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Secretariat manage assignments" ON public.judge_assignments
  FOR ALL USING (is_secretariat())
  WITH CHECK (is_secretariat());

-- 5. Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (is_secretariat() OR public.has_role(auth.uid(), 'admin'));

-- 6. Update scores table for new rubric
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS document_satisfaction integer,
  ADD COLUMN IF NOT EXISTS documents_legitimate boolean,
  ADD COLUMN IF NOT EXISTS verification_source text,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- 7. Add region/country + credentials to profiles for judges
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS credentials_path text;

-- 8. Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users upload docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users read own docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users delete own docs" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9. Update handle_new_user to include country
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'country'
  );
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'submitter');
  END IF;
  RETURN NEW;
END;
$$;

-- 10. Create is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
