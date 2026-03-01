-- Allow secretariat/admin to delete panels (the ALL policy may not cover DELETE explicitly in all cases)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'panels' AND policyname = 'Admin/secretariat delete panels'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin/secretariat delete panels" ON public.panels FOR DELETE TO authenticated USING (is_secretariat() OR is_admin())';
  END IF;
END $$;
