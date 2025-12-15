/*
  # Premium Subscription System

  ## Overview
  Creates a comprehensive premium subscription system with:
  - Subscription tracking with start/end dates
  - Auto-renewal management
  - Payment status tracking
  - Cancellation handling

  ## Changes
  - Create `premium_subscriptions` table
  - Add subscription management functions
  - Update profiles table for premium tracking
*/

-- Create premium subscriptions table
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('weekly', 'monthly', 'yearly')),
  price_amount integer NOT NULL, -- Price in kuruş (149 TL = 14900)
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  auto_renew boolean NOT NULL DEFAULT true,
  cancelled_at timestamptz,
  payment_method text DEFAULT 'mock', -- For future payment integration
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user_id ON premium_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_status ON premium_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_end_date ON premium_subscriptions(end_date);

-- Add RLS policies
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON premium_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON premium_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
DROP POLICY IF EXISTS "Users can create own subscriptions" ON premium_subscriptions;
CREATE POLICY "Users can create own subscriptions" ON premium_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
DROP POLICY IF EXISTS "Users can update own subscriptions" ON premium_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON premium_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add premium subscription fields to profiles
DO $$
BEGIN
  -- Add premium_expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'premium_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_expires_at timestamptz;
  END IF;

  -- Add subscription_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_id uuid REFERENCES premium_subscriptions(id);
  END IF;
END $$;

-- Function to check and update expired premiums
CREATE OR REPLACE FUNCTION check_expired_premiums()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update expired subscriptions
  UPDATE premium_subscriptions 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND end_date < now();

  -- Update profiles for expired premiums
  UPDATE profiles 
  SET is_premium = false, 
      premium_expires_at = null,
      subscription_id = null
  WHERE id IN (
    SELECT user_id 
    FROM premium_subscriptions 
    WHERE status = 'expired' 
      AND end_date < now()
  );
END;
$$;

-- Function to create premium subscription
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

  -- Update profile
  UPDATE profiles 
  SET is_premium = true,
      premium_expires_at = v_end_date,
      subscription_id = v_subscription_id
  WHERE id = p_user_id;

  RETURN v_subscription_id;
END;
$$;

-- Function to cancel premium subscription
CREATE OR REPLACE FUNCTION cancel_premium_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription_id uuid;
BEGIN
  -- Find active subscription
  SELECT id INTO v_subscription_id
  FROM premium_subscriptions
  WHERE user_id = p_user_id 
    AND status = 'active'
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RETURN false;
  END IF;

  -- Cancel subscription (but keep premium until expiry)
  UPDATE premium_subscriptions 
  SET auto_renew = false,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = v_subscription_id;

  RETURN true;
END;
$$;