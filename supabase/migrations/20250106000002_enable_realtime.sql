/*
  # Enable Realtime for notification tables
  
  1. Changes
    - Enable realtime for user_interactions table
    - Enable realtime for messages table
    - Add realtime publication for these tables
*/

-- Enable realtime for user_interactions table
ALTER PUBLICATION supabase_realtime ADD TABLE user_interactions;

-- Enable realtime for messages table  
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('user_interactions', 'messages');