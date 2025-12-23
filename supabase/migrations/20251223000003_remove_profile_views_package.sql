-- Remove profile views package and related functionality
-- This migration removes the "Profilimi Kim İnceledi" feature

-- Remove profile_views packages
DELETE FROM packages WHERE category = 'profile_views';

-- Remove profile_views credits
DELETE FROM user_credits WHERE credit_type = 'profile_views';

-- Remove profile_views from package purchases
DELETE FROM package_purchases WHERE package_id IN (
  SELECT id FROM packages WHERE category = 'profile_views'
);

-- Update check constraints to remove profile_views
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_category_check;
ALTER TABLE packages ADD CONSTRAINT packages_category_check 
  CHECK (category IN ('premium', 'super_like', 'boost'));

ALTER TABLE user_credits DROP CONSTRAINT IF EXISTS user_credits_credit_type_check;
ALTER TABLE user_credits ADD CONSTRAINT user_credits_credit_type_check 
  CHECK (credit_type IN ('super_like', 'boost'));