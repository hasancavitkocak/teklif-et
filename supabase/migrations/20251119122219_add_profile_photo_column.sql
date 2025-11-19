/*
  # Add profile_photo column

  1. Changes
    - Add `profile_photo` (text) to profiles table
    - Stores main profile photo URL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'profile_photo'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo text;
  END IF;
END $$;