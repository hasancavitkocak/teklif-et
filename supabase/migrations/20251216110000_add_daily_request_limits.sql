/*
  # Add Daily Request Limits

  ## Overview
  Adds daily proposal request limits:
  - Free users: 10 requests per day
  - Premium users: Unlimited requests
  - Track daily request counts

  ## Changes
  - Add daily_request_counts table
  - Add functions for request limit management
  - Update discover API to use limits
*/

-- Add table to track daily request counts
CREATE TABLE IF NOT EXISTS daily_request_counts (
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
ALTER TABLE daily_request_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies for request counts
CREATE POLICY "Users can view their own request counts"
  ON daily_request_counts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own request counts"
  ON daily_request_counts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own request counts"
  ON daily_request_counts FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to get daily request limit for user
CREATE OR REPLACE FUNCTION get_daily_request_limit(p_user_id uuid)
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
    RETURN 999; -- Premium users: unlimited (display as ∞)
  ELSE
    RETURN 10; -- Free users: 10 per day
  END IF;
END;
$$;

-- Function to get today's request count for user
CREATE OR REPLACE FUNCTION get_today_request_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Get today's count
  SELECT COALESCE(count, 0) INTO v_count
  FROM daily_request_counts
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to check if user can send request today
CREATE OR REPLACE FUNCTION can_send_request_today(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_count integer;
  v_is_premium boolean;
BEGIN
  -- Get user premium status
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;
  
  -- Premium users have unlimited requests
  IF v_is_premium THEN
    RETURN true;
  END IF;
  
  -- Get user's daily limit
  SELECT get_daily_request_limit(p_user_id) INTO v_limit;
  
  -- Get today's count
  SELECT get_today_request_count(p_user_id) INTO v_count;
  
  -- Check if user can send more requests today
  RETURN v_count < v_limit;
END;
$$;

-- Function to use daily request quota
CREATE OR REPLACE FUNCTION use_daily_request_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_can_send boolean;
BEGIN
  -- Check if user can send request today
  SELECT can_send_request_today(p_user_id) INTO v_can_send;
  
  IF NOT v_can_send THEN
    RETURN false;
  END IF;
  
  -- Increment today's count (only for non-premium users)
  INSERT INTO daily_request_counts (user_id, date, count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    count = daily_request_counts.count + 1,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Function to get remaining requests for today
CREATE OR REPLACE FUNCTION get_remaining_requests_today(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_count integer;
  v_is_premium boolean;
BEGIN
  -- Get user premium status
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;
  
  -- Premium users have unlimited requests
  IF v_is_premium THEN
    RETURN 999; -- Unlimited (display as ∞)
  END IF;
  
  -- Get user's daily limit
  SELECT get_daily_request_limit(p_user_id) INTO v_limit;
  
  -- Get today's count
  SELECT get_today_request_count(p_user_id) INTO v_count;
  
  -- Return remaining count
  RETURN GREATEST(0, v_limit - v_count);
END;
$$;

-- Function to reset daily request counts (for daily job)
CREATE OR REPLACE FUNCTION reset_daily_request_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete old records (older than 7 days to keep some history)
  DELETE FROM daily_request_counts
  WHERE date < CURRENT_DATE - INTERVAL '7 days';
  
  -- Note: We don't need to reset counts, new day = new records
  -- The functions automatically handle new dates
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_request_counts_user_date 
  ON daily_request_counts(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_request_counts_date 
  ON daily_request_counts(date);

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_daily_request_counts_updated_at ON daily_request_counts;
CREATE TRIGGER update_daily_request_counts_updated_at
  BEFORE UPDATE ON daily_request_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();