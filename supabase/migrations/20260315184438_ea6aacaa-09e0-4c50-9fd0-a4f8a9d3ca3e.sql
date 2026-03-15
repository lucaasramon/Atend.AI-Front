
-- Create storage bucket for onboarding uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-files',
  'onboarding-files',
  false,
  10485760,
  ARRAY['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/json']
);

-- RLS for storage: users can upload/read their own files
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'onboarding-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'onboarding-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'onboarding-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can read all files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'onboarding-files' AND public.has_role(auth.uid(), 'admin'));
