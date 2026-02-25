
-- Add storage policies for the documents bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own documents
CREATE POLICY "Users read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow judges and secretariat to read all documents
CREATE POLICY "Judges and secretariat read all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (public.is_judge() OR public.is_secretariat() OR public.is_admin()));

-- Allow users to update/delete their own documents
CREATE POLICY "Users manage own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
