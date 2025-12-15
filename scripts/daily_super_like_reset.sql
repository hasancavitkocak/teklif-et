/*
  # Daily Super Like Reset Job
  
  This script should be run daily at midnight (00:00) to reset super like counts
  for all users (both premium and free users get 1 super like per day)
  
  ## Setup Instructions:
  
  ### Option 1: Supabase Edge Functions (Recommended)
  Create an edge function that runs this query and set up a cron job
  
  ### Option 2: External Cron Job
  Set up a cron job on your server to call this SQL via API
  
  ### Option 3: Manual Execution
  Run this manually each day at midnight
  
  ## Cron Schedule:
  0 0 * * * (Every day at midnight)
*/

-- Reset daily super likes for all users
SELECT add_daily_super_like_to_premium();

-- Reset daily super likes for all users
SELECT add_daily_super_like_to_premium();

-- Log the execution (simple console output)
DO $$
BEGIN
  RAISE NOTICE 'Daily super like reset completed at: %', NOW();
END $$;