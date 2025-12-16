/*
  # Daily Proposal Reset Job

  ## Overview
  This script should be run daily (e.g., via cron job) to clean up old proposal count records.
  
  ## What it does
  - Removes proposal count records older than 7 days
  - Keeps recent history for analytics
  - No need to reset counts as new day = new records automatically

  ## Usage
  Run this daily at midnight:
  ```bash
  psql -d your_database -f daily_proposal_reset.sql
  ```

  Or set up as a cron job:
  ```bash
  0 0 * * * psql -d your_database -f /path/to/daily_proposal_reset.sql
  ```
*/

-- Clean up old daily proposal count records
SELECT reset_daily_proposal_counts();

-- Clean up old daily request count records
SELECT reset_daily_request_counts();

-- Expire old proposals
SELECT expire_old_proposals() as expired_proposals_count;

-- Log the cleanup
DO $$
DECLARE
  v_expired_count integer;
BEGIN
  SELECT expire_old_proposals() INTO v_expired_count;
  RAISE NOTICE 'Daily cleanup completed at %. Expired % proposals.', now(), v_expired_count;
END $$;