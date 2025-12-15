/*
  # Add Invitation Limits

  ## Overview
  Adds daily invitation limits for users
  Free users: 10 invitations per day
  Premium users: unlimited invitations

  ## Changes
  - Add daily_invitations_sent column to profiles table
  - Default value is 0
  - Resets daily with other counters
*/

-- Add daily_invitations_sent column to profiles table
DO $$
BEGIN
  -- Add daily_invitations_sent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_invitations_sent'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_invitations_sent integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Update existing users to have daily_invitations_sent = 0 by default
UPDATE profiles 
SET daily_invitations_sent = 0 
WHERE daily_invitations_sent IS NULL;

-- Update the daily reset function to include invitations
CREATE OR REPLACE FUNCTION add_daily_super_like_to_premium()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date;
  v_affected_count integer;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Reset super likes and invitations for all users
  UPDATE profiles 
  SET daily_super_likes_used = 0,
      daily_invitations_sent = 0,
      last_reset_date = v_today
  WHERE last_reset_date != v_today OR last_reset_date IS NULL;
    
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  
  RAISE NOTICE 'Daily counters reset for % users on date: %', v_affected_count, v_today;
END;
$$;

-- Function to check if user can send invitations
CREATE OR REPLACE FUNCTION can_send_invitations(p_user_id uuid, p_invitation_count integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
  v_today date;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if daily reset is needed
  IF v_user_record.last_reset_date != v_today OR v_user_record.last_reset_date IS NULL THEN
    -- Reset daily counters
    UPDATE profiles 
    SET daily_super_likes_used = 0,
        daily_proposals_sent = 0,
        daily_invitations_sent = 0,
        last_reset_date = v_today
    WHERE id = p_user_id;
    
    -- After reset, user can send invitations
    v_user_record.daily_invitations_sent = 0;
    v_user_record.is_premium = COALESCE(v_user_record.is_premium, false);
  END IF;
  
  -- Premium users have unlimited invitations
  IF v_user_record.is_premium THEN
    RETURN true;
  END IF;
  
  -- Free users: check if they have remaining invitations (10 per day)
  RETURN (v_user_record.daily_invitations_sent + p_invitation_count) <= 10;
END;
$$;

-- Function to use invitations (increment counter)
CREATE OR REPLACE FUNCTION use_invitations(p_user_id uuid, p_invitation_count integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_can_send boolean;
BEGIN
  -- Check if user can send invitations
  SELECT can_send_invitations(p_user_id, p_invitation_count) INTO v_can_send;
  
  IF NOT v_can_send THEN
    RETURN false;
  END IF;
  
  -- Increment invitation usage
  UPDATE profiles 
  SET daily_invitations_sent = daily_invitations_sent + p_invitation_count
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Function to get user's remaining invitations
CREATE OR REPLACE FUNCTION get_remaining_invitations(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
  v_today date;
  v_remaining integer;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check if daily reset is needed
  IF v_user_record.last_reset_date != v_today OR v_user_record.last_reset_date IS NULL THEN
    -- After reset, user has full invitations
    IF COALESCE(v_user_record.is_premium, false) THEN
      RETURN 999; -- Unlimited for premium (display as ∞)
    ELSE
      RETURN 10; -- 10 for free users
    END IF;
  END IF;
  
  -- Premium users have unlimited invitations
  IF COALESCE(v_user_record.is_premium, false) THEN
    RETURN 999; -- Unlimited (display as ∞)
  END IF;
  
  -- Calculate remaining invitations for free users
  v_remaining := 10 - COALESCE(v_user_record.daily_invitations_sent, 0);
  
  RETURN GREATEST(0, v_remaining);
END;
$$;