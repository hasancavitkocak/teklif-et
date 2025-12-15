/*
  # Set Default Invitation Credits

  ## Overview
  Ensures all users (new and existing) have default invitation credits
  - New users get 10 invitation credits by default
  - Existing users without credits get 10 credits
  - Premium users still have unlimited invitations

  ## Changes
  - Add invitation_credits column with default 10
  - Update existing users to have 10 credits if they don't have any
  - Update functions to use credits instead of daily reset system
*/

-- Add invitation_credits column to profiles table
DO $$
BEGIN
  -- Add invitation_credits column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invitation_credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invitation_credits integer DEFAULT 10 NOT NULL;
  END IF;
END $$;

-- Update existing users to have 10 invitation credits if they don't have any
UPDATE profiles 
SET invitation_credits = 10 
WHERE invitation_credits IS NULL OR invitation_credits = 0;

-- Update the can_send_invitations function to use credits
CREATE OR REPLACE FUNCTION can_send_invitations(p_user_id uuid, p_invitation_count integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Premium users have unlimited invitations
  IF COALESCE(v_user_record.is_premium, false) THEN
    RETURN true;
  END IF;
  
  -- Free users: check if they have enough invitation credits
  RETURN COALESCE(v_user_record.invitation_credits, 0) >= p_invitation_count;
END;
$$;

-- Update the use_invitations function to deduct credits
CREATE OR REPLACE FUNCTION use_invitations(p_user_id uuid, p_invitation_count integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_can_send boolean;
  v_is_premium boolean;
BEGIN
  -- Check if user can send invitations
  SELECT can_send_invitations(p_user_id, p_invitation_count) INTO v_can_send;
  
  IF NOT v_can_send THEN
    RETURN false;
  END IF;
  
  -- Check if user is premium
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;
  
  -- Only deduct credits for non-premium users
  IF NOT v_is_premium THEN
    UPDATE profiles 
    SET invitation_credits = GREATEST(0, invitation_credits - p_invitation_count)
    WHERE id = p_user_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Update the get_remaining_invitations function to return credits
CREATE OR REPLACE FUNCTION get_remaining_invitations(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Premium users have unlimited invitations
  IF COALESCE(v_user_record.is_premium, false) THEN
    RETURN 999; -- Unlimited (display as ∞)
  END IF;
  
  -- Return remaining invitation credits for free users
  RETURN COALESCE(v_user_record.invitation_credits, 0);
END;
$$;

-- Function to add invitation credits (for admin or premium purchases)
CREATE OR REPLACE FUNCTION add_invitation_credits(p_user_id uuid, p_credits integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles 
  SET invitation_credits = invitation_credits + p_credits
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Trigger to give new users 10 invitation credits
CREATE OR REPLACE FUNCTION set_default_invitation_credits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set default invitation credits for new users
  IF NEW.invitation_credits IS NULL THEN
    NEW.invitation_credits := 10;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registrations
DROP TRIGGER IF EXISTS trigger_set_default_invitation_credits ON profiles;
CREATE TRIGGER trigger_set_default_invitation_credits
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_invitation_credits();