-- Add latitude and longitude columns to proposals table

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS proposals_location_idx ON proposals(latitude, longitude);

-- Add comments
COMMENT ON COLUMN proposals.latitude IS 'Proposal location latitude for distance calculations';
COMMENT ON COLUMN proposals.longitude IS 'Proposal location longitude for distance calculations';
