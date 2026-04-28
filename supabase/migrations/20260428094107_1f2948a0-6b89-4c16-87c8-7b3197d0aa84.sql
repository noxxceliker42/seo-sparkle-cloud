
-- Create public bucket for brand kit assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Brand assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Authenticated users can upload to a path starting with their firm_id
CREATE POLICY "Users can upload brand assets for their firm"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND (storage.foldername(name))[1] = (
    SELECT firm_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update brand assets for their firm"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (storage.foldername(name))[1] = (
    SELECT firm_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete brand assets for their firm"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (storage.foldername(name))[1] = (
    SELECT firm_id::text FROM public.profiles WHERE id = auth.uid()
  )
);
