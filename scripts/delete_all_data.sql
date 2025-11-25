-- ⚠️ WARNING: This will delete ALL user data! Use with caution!
-- Run this in Supabase SQL Editor

-- Disable triggers temporarily (optional, for faster deletion)
SET session_replication_role = 'replica';

-- Delete in correct order to avoid foreign key errors
BEGIN;

-- 1. Delete notifications
TRUNCATE TABLE notifications CASCADE;

-- 2. Delete messages
TRUNCATE TABLE messages CASCADE;

-- 3. Delete matches
TRUNCATE TABLE matches CASCADE;

-- 4. Delete proposal invitations
TRUNCATE TABLE proposal_invitations CASCADE;

-- 5. Delete proposal requests
TRUNCATE TABLE proposal_requests CASCADE;

-- 6. Delete proposals
TRUNCATE TABLE proposals CASCADE;

-- 7. Delete discover feed
TRUNCATE TABLE discover_feed CASCADE;

-- 8. Delete user interests
TRUNCATE TABLE user_interests CASCADE;

-- 9. Delete profile photos
TRUNCATE TABLE profile_photos CASCADE;

-- 10. Delete profiles (this should cascade to related tables)
TRUNCATE TABLE profiles CASCADE;

-- 11. Delete auth users (if not cascaded)
DELETE FROM auth.users;

COMMIT;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify all tables are empty
SELECT 
    'profiles' as table_name, 
    COUNT(*) as remaining_records 
FROM profiles
UNION ALL
SELECT 'proposals', COUNT(*) FROM proposals
UNION ALL
SELECT 'matches', COUNT(*) FROM matches
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'proposal_invitations', COUNT(*) FROM proposal_invitations
UNION ALL
SELECT 'proposal_requests', COUNT(*) FROM proposal_requests
UNION ALL
SELECT 'discover_feed', COUNT(*) FROM discover_feed
UNION ALL
SELECT 'user_interests', COUNT(*) FROM user_interests
UNION ALL
SELECT 'profile_photos', COUNT(*) FROM profile_photos
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users
ORDER BY table_name;
