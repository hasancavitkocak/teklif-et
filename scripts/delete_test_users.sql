-- Delete only test users (safer option)
-- Modify the WHERE clause to match your test users

-- First, check which users will be deleted
SELECT 
    id, 
    name, 
    email,
    created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE 
    -- Add your conditions here, for example:
    u.email LIKE '%test%' 
    OR u.email LIKE '%@example.com'
    OR p.name LIKE 'Test%'
ORDER BY created_at DESC;

-- If you're sure, uncomment and run the DELETE statements below:

/*
-- Delete related data for test users
WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM notifications WHERE user_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM messages WHERE sender_id IN (SELECT id FROM test_users) 
   OR receiver_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM matches WHERE user1_id IN (SELECT id FROM test_users) 
   OR user2_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM proposal_invitations WHERE inviter_id IN (SELECT id FROM test_users) 
   OR invited_user_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM proposal_requests WHERE requester_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM proposals WHERE creator_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM user_interests WHERE user_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM profile_photos WHERE user_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM discover_feed WHERE user_id IN (SELECT id FROM test_users);

WITH test_users AS (
    SELECT id FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%@example.com'
)
DELETE FROM profiles WHERE id IN (SELECT id FROM test_users);

-- Finally delete from auth.users
DELETE FROM auth.users 
WHERE email LIKE '%test%' 
   OR email LIKE '%@example.com';
*/
