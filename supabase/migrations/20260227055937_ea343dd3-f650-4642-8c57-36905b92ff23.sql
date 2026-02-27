-- Allow admin to read roles so Admin Messaging can find recipients
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users read own role or elevated roles"
ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_secretariat()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admin/super_admin to read profiles for admin recipient selection
DROP POLICY IF EXISTS "Users read own profile or secretariat/judge reads all" ON public.profiles;
CREATE POLICY "Users read own profile or elevated roles read all"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_secretariat()
  OR is_judge()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admin/super_admin to update submissions to prevent RLS errors in admin/secretariat workflows
DROP POLICY IF EXISTS "Submitter updates own submissions" ON public.submissions;
CREATE POLICY "Submitter or elevated roles update submissions"
ON public.submissions
FOR UPDATE
USING (
  submitter_id = auth.uid()
  OR is_secretariat()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  submitter_id = auth.uid()
  OR is_secretariat()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admin/super_admin to read all submissions for management UIs
DROP POLICY IF EXISTS "Submitter reads own submissions" ON public.submissions;
CREATE POLICY "Submitter or elevated roles read submissions"
ON public.submissions
FOR SELECT
USING (
  submitter_id = auth.uid()
  OR is_judge()
  OR is_secretariat()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);