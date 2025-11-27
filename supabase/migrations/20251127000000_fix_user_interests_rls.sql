-- Fix user_interests RLS to allow viewing all users' interests
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can view own interests" ON user_interests;

-- Create new policy to allow viewing all interests (for profile viewing)
CREATE POLICY "Users can view all interests"
  ON user_interests FOR SELECT
  TO authenticated
  USING (true);

-- Keep insert/delete policies restrictive (users can only manage their own)
-- These should already exist, but we'll recreate them to be sure
DROP POLICY IF EXISTS "Users can insert their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can manage own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can delete their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can delete own interests" ON user_interests;

CREATE POLICY "Users can insert their own interests"
  ON user_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests"
  ON user_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
