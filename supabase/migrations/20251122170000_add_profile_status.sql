-- Add is_active column to profiles table for account freezing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Add comment
COMMENT ON COLUMN profiles.is_active IS 'Whether the profile is active or frozen';
