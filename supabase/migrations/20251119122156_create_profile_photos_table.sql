/*
  # Create Profile Photos Table

  1. New Tables
    - `profile_photos`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `photo_url` (text, photo URL or base64)
      - `order` (integer, display order)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Users can view all photos (for matching)
    - Users can only manage their own photos
*/

CREATE TABLE IF NOT EXISTS profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all photos"
  ON profile_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own photos"
  ON profile_photos FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own photos"
  ON profile_photos FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own photos"
  ON profile_photos FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Create index
CREATE INDEX IF NOT EXISTS profile_photos_profile_id_idx ON profile_photos(profile_id);
CREATE INDEX IF NOT EXISTS profile_photos_order_idx ON profile_photos("order");