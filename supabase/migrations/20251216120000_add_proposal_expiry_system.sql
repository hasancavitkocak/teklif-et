/*
  # Add Proposal Expiry System

  ## Overview
  Adds automatic proposal expiry system:
  - Proposals expire after their event_datetime passes
  - Automatic cleanup job to mark expired proposals
  - Function to check and update expired proposals

  ## Changes
  - Add function to expire old proposals
  - Add job script for automatic expiry
  - Update proposal queries to exclude expired ones
*/

-- Function to expire proposals that have passed their event_datetime
CREATE OR REPLACE FUNCTION expire_old_proposals()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired_count integer;
  v_total_expired integer := 0;
BEGIN
  -- Update proposals where event_datetime has passed and status is still active
  UPDATE proposals 
  SET 
    status = 'expired',
    updated_at = now()
  WHERE 
    status = 'active' 
    AND event_datetime IS NOT NULL 
    AND event_datetime < now();
  
  -- Get count of expired proposals
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  v_total_expired := v_total_expired + v_expired_count;
  
  -- Also expire proposals older than 7 days if they don't have event_datetime
  UPDATE proposals 
  SET 
    status = 'expired',
    updated_at = now()
  WHERE 
    status = 'active' 
    AND event_datetime IS NULL 
    AND created_at < now() - INTERVAL '7 days';
  
  -- Add to total count
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  v_total_expired := v_total_expired + v_expired_count;
  
  -- Auto-reject pending requests for expired proposals
  UPDATE proposal_requests 
  SET 
    status = 'auto_rejected',
    updated_at = now()
  WHERE 
    status = 'pending' 
    AND proposal_id IN (
      SELECT id FROM proposals WHERE status = 'expired'
    );
  
  -- Mark notifications as read for expired proposals (optional cleanup)
  UPDATE notifications 
  SET 
    is_read = true,
    updated_at = now()
  WHERE 
    is_read = false 
    AND type IN ('new_proposal_request', 'proposal_accepted', 'proposal_rejected')
    AND related_proposal_id IN (
      SELECT id FROM proposals WHERE status = 'expired'
    );
  
  RETURN v_total_expired;
END;
$$;

-- Function to clean up very old expired proposals (optional - for database cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_expired_proposals()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete expired proposals older than 30 days
  -- This also deletes related proposal_requests due to CASCADE
  DELETE FROM proposals 
  WHERE 
    status = 'expired' 
    AND updated_at < now() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Function to get active proposals (excludes expired ones)
CREATE OR REPLACE FUNCTION get_active_proposals_for_user(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  creator_id uuid,
  activity_name text,
  interest_id uuid,
  city text,
  event_datetime timestamptz,
  venue_name text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- First expire old proposals
  PERFORM expire_old_proposals();
  
  -- Then return active proposals
  RETURN QUERY
  SELECT 
    p.id,
    p.creator_id,
    p.activity_name,
    p.interest_id,
    p.city,
    p.event_datetime,
    p.venue_name,
    p.status,
    p.created_at
  FROM proposals p
  WHERE p.creator_id = p_user_id 
    AND p.status IN ('active', 'matched', 'completed')
  ORDER BY p.created_at DESC;
END;
$$;

-- Create index for better performance on expiry queries
CREATE INDEX IF NOT EXISTS idx_proposals_status_event_datetime 
  ON proposals(status, event_datetime) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_proposals_status_created_at 
  ON proposals(status, created_at) 
  WHERE status = 'active';

-- Create index for expired proposals cleanup
CREATE INDEX IF NOT EXISTS idx_proposals_expired_updated_at 
  ON proposals(updated_at) 
  WHERE status = 'expired';