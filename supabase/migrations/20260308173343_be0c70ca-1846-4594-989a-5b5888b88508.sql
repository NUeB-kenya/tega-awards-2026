-- Allow admin/secretariat to delete profiles (needed for delete-user edge function via service role)
CREATE POLICY "Admin deletes profiles"
ON public.profiles
FOR DELETE
USING (is_admin() OR has_role(auth.uid(), 'super_admin'::app_role));