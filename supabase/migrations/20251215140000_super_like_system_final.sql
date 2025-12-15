/*
  # Super Like System - Final Implementation

  ## Overview
  Complete super like system with daily reset functionality
  This migration is safe to run multiple times

  ## Changes
  - Create super like management functions
  - Update premium subscription to add super like bonus
  - Safe to run on existing database
*/

-- Function to reset daily super likes for all users
CREATE OR REPLACE FUNCTION reset_daily_super_likes()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Reset all users' daily super likes
  UPDATE profiles 
  SET daily_super_likes_used = 0,
      last_reset_date = v_today
  WHERE last_reset_date != v_today OR last_reset_date IS NULL;
  
  -- Log the reset
  RAISE NOTICE 'Daily super likes reset completed for date: %', v_today;
END;
$$;

-- Function to add super like to premium users daily
CREATE OR REPLACE FUNCTION add_daily_super_like_to_premium()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date;
  v_affected_count integer;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Reset super likes for all users (both premium and free get 1 per day)
  UPDATE profiles 
  SET daily_super_likes_used = 0,
      last_reset_date = v_today
  WHERE last_reset_date != v_today OR last_reset_date IS NULL;
    
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  
  RAISE NOTICE 'Daily super likes reset for % users on date: %', v_affected_count, v_today;
END;
$$;

-- Function to check if user can use super like
CREATE OR REPLACE FUNCTION can_use_super_like(p_user_id uuid)
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
        last_reset_date = v_today
    WHERE id = p_user_id;
    
    -- User can use super like after reset
    RETURN true;
  END IF;
  
  -- Check if user has remaining super likes (both premium and free get 1 per day)
  RETURN v_user_record.daily_super_likes_used < 1;
END;
$$;

-- Function to use super like (increment counter)
CREATE OR REPLACE FUNCTION use_super_like(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_can_use boolean;
BEGIN
  -- Check if user can use super like
  SELECT can_use_super_like(p_user_id) INTO v_can_use;
  
  IF NOT v_can_use THEN
    RETURN false;
  END IF;
  
  -- Increment super like usage
  UPDATE profiles 
  SET daily_super_likes_used = daily_super_likes_used + 1
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Function to get user's remaining super likes
CREATE OR REPLACE FUNCTION get_remaining_super_likes(p_user_id uuid)
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
    -- After reset, user has 1 super like
    RETURN 1;
  END IF;
  
  -- Calculate remaining super likes (both premium and free get 1 per day)
  v_remaining := 1 - v_user_record.daily_super_likes_used;
  
  RETURN GREATEST(0, v_remaining);
END;
$$;

-- Update create_premium_subscription function to add super like bonus
CREATE OR REPLACE FUNCTION create_premium_subscription(
  p_user_id uuid,
  p_plan_type text,
  p_price_amount integer
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_end_date timestamptz;
  v_subscription_id uuid;
BEGIN
  -- Calculate end date based on plan type
  CASE p_plan_type
    WHEN 'weekly' THEN
      v_end_date := now() + interval '7 days';
    WHEN 'monthly' THEN
      v_end_date := now() + interval '1 month';
    WHEN 'yearly' THEN
      v_end_date := now() + interval '1 year';
    ELSE
      RAISE EXCEPTION 'Invalid plan type: %', p_plan_type;
  END CASE;

  -- Cancel any existing active subscriptions
  UPDATE premium_subscriptions 
  SET status = 'cancelled', 
      cancelled_at = now(),
      auto_renew = false,
      updated_at = now()
  WHERE user_id = p_user_id 
    AND status = 'active';

  -- Create new subscription
  INSERT INTO premium_subscriptions (
    user_id, plan_type, price_amount, end_date
  ) VALUES (
    p_user_id, p_plan_type, p_price_amount, v_end_date
  ) RETURNING id INTO v_subscription_id;

  -- Update profile and add super like bonus
  UPDATE profiles 
  SET is_premium = true,
      premium_expires_at = v_end_date,
      subscription_id = v_subscription_id,
      daily_super_likes_used = GREATEST(0, daily_super_likes_used - 1) -- Premium satın alınca 1 super like ekle
  WHERE id = p_user_id;

  RETURN v_subscription_id;
END;
$$;