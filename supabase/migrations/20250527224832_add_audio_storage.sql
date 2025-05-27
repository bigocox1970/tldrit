-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('tldrit', 'tldrit', true);

-- Policy to allow authenticated users to read their own audio files
CREATE POLICY "Users can read their own audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tldrit' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy to allow service role to upload audio files
CREATE POLICY "Service role can upload audio files"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'tldrit');

-- Policy to allow service role to update audio files
CREATE POLICY "Service role can update audio files"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'tldrit');
