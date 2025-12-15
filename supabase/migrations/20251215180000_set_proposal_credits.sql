/*
  # Set Proposal Credits

  ## Overview
  Adds proposal credits system similar to invitation credits
  - New users get 10 proposal credits by default
  - Existing users get 10 credits
  - Premium users still have unlimited proposals

  ## Changes
  - Add proposal_credits column with default 10
  - Update existing users to have 10 credits
  - Update functions to use credits instead of daily reset system
*/

-- Add proposal_credits column to profiles table
DO $$
BEGIN
  -- Add proposal_credits column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'proposal_credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN proposal_credits integer DEFAULT 10 NOT NULL;
  END IF;
END $$;

-- Update existing users to have 10 proposal credits if they don't have any
UPDATE profiles 
SET proposal_credits = 10 
WHERE proposal_credits IS NULL OR proposal_credits = 0;

-- Function to check if user can create proposals
CREATE OR REPLACE FUNCTION can_create_proposal(p_user_id uuid)
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
  
  -- Premium users have unlimited proposals
  IF COALESCE(v_user_record.is_premium, false) THEN
    RETURN true;
  END IF;
  
  -- Free users: check if they have proposal credits
  RETURN COALESCE(v_user_record.proposal_credits, 0) > 0;
END;
$$;

-- Function to use proposal credit
CREATE OR REPLACE FUNCTION use_proposal_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_can_create boolean;
  v_is_premium boolean;
BEGIN
  -- Check if user can create proposal
  SELECT can_create_proposal(p_user_id) INTO v_can_create;
  
  IF NOT v_can_create THEN
    RETURN false;
  END IF;
  
  -- Check if user is premium
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;
  
  -- Only deduct credits for non-premium users
  IF NOT v_is_premium THEN
    UPDATE profiles 
    SET proposal_credits = GREATEST(0, proposal_credits - 1)
    WHERE id = p_user_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to get user's remaining proposal credits
CREATE OR REPLACE FUNCTION get_remaining_proposals(p_user_id uuid)
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
  
  -- Premium users have unlimited proposals
  IF COALESCE(v_user_record.is_premium, false) THEN
    RETURN 999; -- Unlimited (display as ∞)
  END IF;
  
  -- Return remaining proposal credits for free users
  RETURN COALESCE(v_user_record.proposal_credits, 0);
END;
$$;

-- Function to add proposal credits (for admin or premium purchases)
CREATE OR REPLACE FUNCTION add_proposal_credits(p_user_id uuid, p_credits integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles 
  SET proposal_credits = proposal_credits + p_credits
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Update the trigger to also set default proposal credits
CREATE OR REPLACE FUNCTION set_default_credits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set default invitation credits for new users
  IF NEW.invitation_credits IS NULL THEN
    NEW.invitation_credits := 10;
  END IF;
  
  -- Set default proposal credits for new users
  IF NEW.proposal_credits IS NULL THEN
    NEW.proposal_credits := 10;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trigger for new user registrations
DROP TRIGGER IF EXISTS trigger_set_default_invitation_credits ON profiles;
DROP TRIGGER IF EXISTS trigger_set_default_credits ON profiles;
CREATE TRIGGER trigger_set_default_credits
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_credits();