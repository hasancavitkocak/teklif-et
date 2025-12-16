/*
  # Premium Super Like Increase

  ## Overview
  Premium kullanıcılar için super like sayısını artır:
  - Free kullanıcılar: 1 super like/gün
  - Premium kullanıcılar: 3 super like/gün

  ## Changes
  - Update can_use_super_like function
  - Update get_remaining_super_likes function
  - Premium users get 3 super likes per day
*/

-- Function to check if user can use super like (updated for premium)
CREATE OR REPLACE FUNCTION can_use_super_like(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
  v_today date;
  v_daily_limit integer;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Set daily limit based on premium status
  IF COALESCE(v_user_record.is_premium, false) THEN
    v_daily_limit := 3; -- Premium users: 3 per day
  ELSE
    v_daily_limit := 1; -- Free users: 1 per day
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
  
  -- Check if user has remaining super likes
  RETURN v_user_record.daily_super_likes_used < v_daily_limit;
END;
$$;

-- Function to get remaining super likes (updated for premium)
CREATE OR REPLACE FUNCTION get_remaining_super_likes(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
  v_today date;
  v_daily_limit integer;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Set daily limit based on premium status
  IF COALESCE(v_user_record.is_premium, false) THEN
    v_daily_limit := 3; -- Premium users: 3 per day
  ELSE
    v_daily_limit := 1; -- Free users: 1 per day
  END IF;
  
  -- Check if daily reset is needed
  IF v_user_record.last_reset_date != v_today OR v_user_record.last_reset_date IS NULL THEN
    RETURN v_daily_limit; -- Full quota after reset
  END IF;
  
  -- Return remaining super likes
  RETURN GREATEST(0, v_daily_limit - v_user_record.daily_super_likes_used);
END;
$$;