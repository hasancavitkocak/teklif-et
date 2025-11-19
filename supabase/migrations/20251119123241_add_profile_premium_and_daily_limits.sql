/*
  # Add Premium and Daily Limits to Profiles

  ## Overview
  Adds premium membership status and daily usage limits to profiles table.

  ## Changes
  - Add `is_premium` column for premium membership status
  - Add `daily_proposals_sent` counter for free tier limit
  - Add `daily_super_likes_used` counter for super likes
  - Add `last_reset_date` for daily limit resets
  - Add `phone` column for user phone number

  ## Notes
  - All columns nullable with defaults to avoid breaking existing data
  - Daily limits reset automatically based on last_reset_date
*/

-- Add premium and daily limit columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_premium boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_proposals_sent'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_proposals_sent integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_super_likes_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_super_likes_used integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_reset_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_reset_date date DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;