
-- Fix notification insert policy: allow admin and super_admin to insert notifications
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "System inserts notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  is_secretariat() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admin to read scores for finance/oversight
DROP POLICY IF EXISTS "Judge/secretariat reads scores" ON public.scores;
CREATE POLICY "Judge/secretariat/admin reads scores" ON public.scores
FOR SELECT TO authenticated
USING (
  judge_id = auth.uid() 
  OR is_secretariat() 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admin to read all payments
DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments or admin" ON public.payments
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = payments.submission_id AND s.submitter_id = auth.uid())
  OR is_secretariat() 
  OR is_admin()
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
