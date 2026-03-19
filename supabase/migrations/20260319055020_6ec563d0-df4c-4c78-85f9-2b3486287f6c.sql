-- Allow judges to update submissions they are assigned to (for status transition to 'scored')
DROP POLICY IF EXISTS "Submitter or elevated roles update submissions" ON public.submissions;

CREATE POLICY "Submitter or elevated roles update submissions"
  ON public.submissions FOR UPDATE
  USING (
    (submitter_id = auth.uid()) 
    OR is_judge() 
    OR is_secretariat() 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (submitter_id = auth.uid()) 
    OR is_judge() 
    OR is_secretariat() 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );