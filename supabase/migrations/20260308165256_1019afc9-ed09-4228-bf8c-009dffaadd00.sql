CREATE POLICY "Secretariat/admin insert submissions for promotion"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (
  is_secretariat() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);