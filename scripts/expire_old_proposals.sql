/*
  # Expire Old Proposals Job

  ## Overview
  This script should be run regularly (e.g., every hour via cron job) to automatically
  expire proposals that have passed their event_datetime.
  
  ## What it does
  - Marks proposals as 'expired' if their event_datetime has passed
  - Marks proposals as 'expired' if they're older than 7 days and have no event_datetime
  - Optionally cleans up very old expired proposals (30+ days)

  ## Usage
  Run this hourly via cron job:
  ```bash
  0 * * * * psql -d your_database -f /path/to/expire_old_proposals.sql
  ```

  Or run manually:
  ```bash
  psql -d your_database -f expire_old_proposals.sql
  ```
*/

-- Expire old proposals
SELECT expire_old_proposals() as expired_count;

-- Optional: Clean up very old expired proposals (uncomment if needed)
-- SELECT cleanup_old_expired_proposals() as deleted_count;

-- Log the expiry process
DO $$
DECLARE
  v_expired_count integer;
BEGIN
  SELECT expire_old_proposals() INTO v_expired_count;
  RAISE NOTICE 'Proposal expiry job completed at %. Expired % proposals.', now(), v_expired_count;
END $$;