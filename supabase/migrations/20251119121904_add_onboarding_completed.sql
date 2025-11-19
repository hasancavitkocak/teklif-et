/*
  # Add onboarding_completed column to profiles

  1. Changes
    - Add `onboarding_completed` (boolean) to profiles table
    - Default value is false
    - Track if user completed onboarding flow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;