-- Add latitude and longitude columns to profiles table for accurate distance calculations

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS profiles_location_idx ON profiles(latitude, longitude);

-- Add comment
COMMENT ON COLUMN profiles.latitude IS 'User location latitude for distance calculations';
COMMENT ON COLUMN profiles.longitude IS 'User location longitude for distance calculations';
