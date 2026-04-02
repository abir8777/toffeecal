
CREATE POLICY "Users can view their own avatar"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
