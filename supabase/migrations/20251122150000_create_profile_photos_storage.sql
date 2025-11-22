-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete profile photos" ON storage.objects;

-- Create storage bucket for profile photos (public bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload (we'll control this in app logic)
CREATE POLICY "Anyone can upload profile photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'profile-photos');

-- Allow public read access to all profile photos
CREATE POLICY "Public can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Allow anyone to update
CREATE POLICY "Anyone can update profile photos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'profile-photos');

-- Allow anyone to delete
CREATE POLICY "Anyone can delete profile photos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'profile-photos');
