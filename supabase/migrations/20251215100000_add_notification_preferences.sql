-- Add notification preferences to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_matches BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_proposals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_marketing BOOLEAN DEFAULT false;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_notifications ON profiles(notification_messages, notification_matches, notification_proposals);

-- Update existing users to have default notification settings
UPDATE profiles 
SET 
  notification_messages = true,
  notification_matches = true,
  notification_proposals = true,
  notification_marketing = false
WHERE 
  notification_messages IS NULL 
  OR notification_matches IS NULL 
  OR notification_proposals IS NULL 
  OR notification_marketing IS NULL;

COMMENT ON COLUMN profiles.notification_messages IS 'Yeni mesaj bildirimleri';
COMMENT ON COLUMN profiles.notification_matches IS 'Yeni eşleşme bildirimleri';
COMMENT ON COLUMN profiles.notification_proposals IS 'Teklif bildirimleri (kabul/red)';
COMMENT ON COLUMN profiles.notification_marketing IS 'Pazarlama ve promosyon bildirimleri';