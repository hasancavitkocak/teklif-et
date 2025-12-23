-- Distance filtered proposal fetching function
-- This function performs distance calculation at SQL level to improve performance

CREATE OR REPLACE FUNCTION get_proposals_within_distance(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION DEFAULT 50,
  user_id UUID DEFAULT NULL,
  excluded_proposal_ids UUID[] DEFAULT '{}',
  excluded_user_ids UUID[] DEFAULT '{}',
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  activity_name TEXT,
  city TEXT,
  is_boosted BOOLEAN,
  interest_id UUID,
  creator_id UUID,
  event_datetime TIMESTAMPTZ,
  venue_name TEXT,
  creator JSONB,
  interest JSONB,
  distance DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.activity_name,
    p.city,
    p.is_boosted,
    p.interest_id,
    p.creator_id,
    p.event_datetime,
    p.venue_name,
    jsonb_build_object(
      'name', pr.name,
      'profile_photo', pr.profile_photo,
      'birth_date', pr.birth_date,
      'gender', pr.gender,
      'is_active', pr.is_active,
      'latitude', pr.latitude,
      'longitude', pr.longitude
    ) as creator,
    jsonb_build_object(
      'name', i.name
    ) as interest,
    -- Haversine formula for distance calculation (km)
    (6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(pr.latitude)) * 
      cos(radians(pr.longitude) - radians(user_lng)) + 
      sin(radians(user_lat)) * 
      sin(radians(pr.latitude))
    )) as distance
  FROM proposals p
  JOIN profiles pr ON p.creator_id = pr.id
  LEFT JOIN interests i ON p.interest_id = i.id
  WHERE 
    p.status = 'active'
    AND (user_id IS NULL OR p.creator_id != user_id)
    AND (p.event_datetime IS NULL OR p.event_datetime >= NOW())
    AND pr.is_active = true
    AND pr.latitude IS NOT NULL 
    AND pr.longitude IS NOT NULL
    AND (excluded_proposal_ids = '{}' OR p.id != ALL(excluded_proposal_ids))
    AND (excluded_user_ids = '{}' OR p.creator_id != ALL(excluded_user_ids))
    -- Distance filter using Haversine formula
    AND (6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(pr.latitude)) * 
      cos(radians(pr.longitude) - radians(user_lng)) + 
      sin(radians(user_lat)) * 
      sin(radians(pr.latitude))
    )) <= max_distance_km
  ORDER BY 
    p.is_boosted DESC,
    distance ASC
  LIMIT limit_count;
END;
$$;

-- Function comment
COMMENT ON FUNCTION get_proposals_within_distance IS 'Fetches proposals within specified distance from user location. Distance calculation is performed at SQL level.';