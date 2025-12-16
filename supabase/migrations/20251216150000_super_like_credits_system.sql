/*
  # Super Like Credits System

  ## Overview
  Super Like kredi sistemi:
  - Kullanıcılar Super Like paketi satın alabilir
  - 10 Super Like = ₺99
  - Krediler günlük limitten bağımsız kullanılır
  - Premium kullanıcılar günde 3, free kullanıcılar günde 1 + krediler

  ## Changes
  - Add super_like_credits column to profiles
  - Add super_like_purchases table for tracking
  - Update super like functions to use credits
*/

-- Add super_like_credits column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_like_credits integer DEFAULT 0 NOT NULL;

-- Create super like purchases table
CREATE TABLE IF NOT EXISTS super_like_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  package_type varchar(50) NOT NULL, -- 'super_like_10'
  credits_amount integer NOT NULL,
  price_paid integer NOT NULL, -- in kuruş (9900 = ₺99)
  purchase_date timestamptz DEFAULT now() NOT NULL,
  status varchar(20) DEFAULT 'completed' NOT NULL, -- 'pending', 'completed', 'failed'
  payment_method varchar(50), -- 'apple_pay', 'google_pay', 'credit_card'
  transaction_id varchar(255),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE super_like_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for super_like_purchases
CREATE POLICY "Users can view their own purchases"
  ON super_like_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
  ON super_like_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_super_like_purchases_user_id ON super_like_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_super_like_purchases_date ON super_like_purchases(purchase_date DESC);

-- Function to purchase super like credits
CREATE OR REPLACE FUNCTION purchase_super_like_credits(
  p_user_id uuid,
  p_package_type varchar(50),
  p_credits_amount integer,
  p_price_paid integer,
  p_payment_method varchar(50) DEFAULT NULL,
  p_transaction_id varchar(255) DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert purchase record
  INSERT INTO super_like_purchases (
    user_id,
    package_type,
    credits_amount,
    price_paid,
    payment_method,
    transaction_id,
    status
  ) VALUES (
    p_user_id,
    p_package_type,
    p_credits_amount,
    p_price_paid,
    p_payment_method,
    p_transaction_id,
    'completed'
  );

  -- Add credits to user profile
  UPDATE profiles 
  SET super_like_credits = super_like_credits + p_credits_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- Function to use super like (updated to use credits first)
CREATE OR REPLACE FUNCTION use_super_like(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
  v_can_use_daily boolean;
  v_is_premium boolean;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if user has credits
  IF v_user_record.super_like_credits > 0 THEN
    -- Use credit first (no daily limit check needed)
    UPDATE profiles 
    SET super_like_credits = super_like_credits - 1
    WHERE id = p_user_id;
    
    RETURN true;
  END IF;

  -- No credits, check daily limit
  SELECT can_use_super_like(p_user_id) INTO v_can_use_daily;
  
  IF NOT v_can_use_daily THEN
    RETURN false;
  END IF;

  -- Check if user is premium
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;
  
  -- Only increment daily counter for users without credits
  IF NOT v_is_premium THEN
    UPDATE profiles 
    SET daily_super_likes_used = daily_super_likes_used + 1
    WHERE id = p_user_id;
  ELSE
    -- Premium users: increment counter (they get 3 per day)
    UPDATE profiles 
    SET daily_super_likes_used = daily_super_likes_used + 1
    WHERE id = p_user_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to get total super likes available
CREATE OR REPLACE FUNCTION get_total_super_likes_available(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record profiles%ROWTYPE;
  v_daily_remaining integer;
  v_credits integer;
  v_today date;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Get user profile
  SELECT * INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'credits', 0,
      'daily_remaining', 0,
      'total', 0
    );
  END IF;

  -- Get credits
  v_credits := COALESCE(v_user_record.super_like_credits, 0);

  -- Get daily remaining
  SELECT get_remaining_super_likes(p_user_id) INTO v_daily_remaining;

  RETURN jsonb_build_object(
    'credits', v_credits,
    'daily_remaining', v_daily_remaining,
    'total', v_credits + v_daily_remaining
  );
END;
$$;