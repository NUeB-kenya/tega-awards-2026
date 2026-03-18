
-- Fix judge_applications RLS: include super_admin in read and update policies

DROP POLICY IF EXISTS "Admin/secretariat read all judge applications" ON public.judge_applications;
CREATE POLICY "Admin/secretariat read all judge applications"
  ON public.judge_applications FOR SELECT TO authenticated
  USING (is_admin() OR is_secretariat() OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admin/secretariat update judge applications" ON public.judge_applications;
CREATE POLICY "Admin/secretariat update judge applications"
  ON public.judge_applications FOR UPDATE TO authenticated
  USING (is_admin() OR is_secretariat() OR has_role(auth.uid(), 'super_admin'::app_role));
