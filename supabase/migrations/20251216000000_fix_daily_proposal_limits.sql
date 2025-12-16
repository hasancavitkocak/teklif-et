/*
  # Fix Daily Proposal Limits

  ## Overview
  Changes proposal system from credit-based to daily limit-based:
  - Free users: 1 proposal per day
  - Premium users: 5 proposals per day
  - Users can create proposals for different dates
  - Cannot create multiple proposals for the same date

  ## Changes
  - Remove proposal_credits system
  - Add daily proposal tracking
  - Update functions for daily limits
  - Add job for daily reset
*/

-- Remove proposal_credits column (we'll use daily tracking instead)
ALTER TABLE profiles DROP COLUMN IF EXISTS proposal_credits;

-- Add table to track daily proposal counts
CREATE TABLE IF NOT EXISTS daily_proposal_counts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one record per user per date
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE daily_proposal_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own daily proposal counts" ON daily_proposal_counts;
CREATE POLICY "Users can view their own daily proposal counts"
  ON daily_proposal_counts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily proposal counts" ON daily_proposal_counts;
CREATE POLICY "Users can insert their own daily proposal counts"
  ON daily_proposal_counts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily proposal counts" ON daily_proposal_counts;
CREATE POLICY "Users can update their own daily proposal counts"
  ON daily_proposal_counts FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to get daily proposal limit for user
CREATE OR REPLACE FUNCTION get_daily_proposal_limit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_premium boolean;
BEGIN
  -- Get user premium status
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Return limit based on premium status
  IF v_is_premium THEN
    RETURN 5; -- Premium users: 5 per day
  ELSE
    RETURN 1; -- Free users: 1 per day
  END IF;
END;
$$;

-- Function to get today's proposal count for user
CREATE OR REPLACE FUNCTION get_today_proposal_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Get today's count
  SELECT COALESCE(count, 0) INTO v_count
  FROM daily_proposal_counts
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to check if user can create proposal today
CREATE OR REPLACE FUNCTION can_create_proposal_today(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  -- Get user's daily limit
  SELECT get_daily_proposal_limit(p_user_id) INTO v_limit;
  
  -- Get today's count
  SELECT get_today_proposal_count(p_user_id) INTO v_count;
  
  -- Check if user can create more proposals today
  RETURN v_count < v_limit;
END;
$$;

-- Function to check if user can create proposal for specific date
CREATE OR REPLACE FUNCTION can_create_proposal_for_date(p_user_id uuid, p_date date)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_count integer;
BEGIN
  -- Check if user already has a proposal for this date
  -- Check both event_datetime and created_at for date matching
  SELECT COUNT(*) INTO v_existing_count
  FROM proposals
  WHERE creator_id = p_user_id 
    AND (
      (event_datetime IS NOT NULL AND date_trunc('day', event_datetime) = p_date)
      OR 
      (event_datetime IS NULL AND date_trunc('day', created_at) = p_date)
    )
    AND status NOT IN ('cancelled', 'expired');
  
  -- User can only have one proposal per date (regardless of premium status)
  RETURN v_existing_count = 0;
END;
$$;

-- Function to use daily proposal quota
CREATE OR REPLACE FUNCTION use_daily_proposal_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_can_create boolean;
BEGIN
  -- Check if user can create proposal today
  SELECT can_create_proposal_today(p_user_id) INTO v_can_create;
  
  IF NOT v_can_create THEN
    RETURN false;
  END IF;
  
  -- Increment today's count
  INSERT INTO daily_proposal_counts (user_id, date, count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    count = daily_proposal_counts.count + 1,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Function to get remaining proposals for today
CREATE OR REPLACE FUNCTION get_remaining_proposals_today(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  -- Get user's daily limit
  SELECT get_daily_proposal_limit(p_user_id) INTO v_limit;
  
  -- Get today's count
  SELECT get_today_proposal_count(p_user_id) INTO v_count;
  
  -- Return remaining count
  RETURN GREATEST(0, v_limit - v_count);
END;
$$;

-- Update the legacy functions to use new system
CREATE OR REPLACE FUNCTION can_create_proposal(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN can_create_proposal_today(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION use_proposal_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN use_daily_proposal_quota(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION get_remaining_proposals(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN get_remaining_proposals_today(p_user_id);
END;
$$;

-- Function to reset daily proposal counts (for daily job)
CREATE OR REPLACE FUNCTION reset_daily_proposal_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete old records (older than 7 days to keep some history)
  DELETE FROM daily_proposal_counts
  WHERE date < CURRENT_DATE - INTERVAL '7 days';
  
  -- Note: We don't need to reset counts, new day = new records
  -- The functions automatically handle new dates
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_proposal_counts_user_date 
  ON daily_proposal_counts(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_proposal_counts_date 
  ON daily_proposal_counts(date);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_daily_proposal_counts_updated_at ON daily_proposal_counts;
CREATE TRIGGER update_daily_proposal_counts_updated_at
  BEFORE UPDATE ON daily_proposal_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();