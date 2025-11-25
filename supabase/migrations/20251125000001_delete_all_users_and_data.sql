-- Delete all users and related data
-- This script deletes all data in the correct order to avoid foreign key constraint errors

-- 1. Delete all notifications
DELETE FROM notifications;

-- 2. Delete all messages
DELETE FROM messages;

-- 3. Delete all matches
DELETE FROM matches;

-- 4. Delete all proposal invitations
DELETE FROM proposal_invitations;

-- 5. Delete all proposal requests
DELETE FROM proposal_requests;

-- 6. Delete all proposals
DELETE FROM proposals;

-- 7. Delete all discover feed entries
DELETE FROM discover_feed;

-- 8. Delete all user interests
DELETE FROM user_interests;

-- 9. Delete all profile photos
DELETE FROM profile_photos;

-- 10. Delete all profiles (this will cascade to auth.users)
DELETE FROM profiles;

-- 11. Delete all users from auth.users (if profiles didn't cascade)
DELETE FROM auth.users;

-- Verify deletion
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
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
SELECT 'auth.users', COUNT(*) FROM auth.users;
