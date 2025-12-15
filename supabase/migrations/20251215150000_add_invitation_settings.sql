/*
  # Add Invitation Settings

  ## Overview
  Adds a flag to control whether users can be invited to proposals
  Users can enable/disable this in their profile settings

  ## Changes
  - Add allow_invitations column to profiles table
  - Default value is true (users can be invited by default)
*/

-- Add allow_invitations column to profiles table
DO $$
BEGIN
  -- Add allow_invitations column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'allow_invitations'
  ) THEN
    ALTER TABLE profiles ADD COLUMN allow_invitations boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Update existing users to have allow_invitations = true by default
UPDATE profiles 
SET allow_invitations = true 
WHERE allow_invitations IS NULL;