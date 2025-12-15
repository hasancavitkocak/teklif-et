-- Add deleted_by field to matches table for soft delete functionality
ALTER TABLE matches ADD COLUMN deleted_by UUID REFERENCES profiles(id);

-- Add index for better performance
CREATE INDEX idx_matches_deleted_by ON matches(deleted_by);

-- Update RLS policies to exclude deleted matches
DROP POLICY IF EXISTS "Users can view their matches" ON matches;
CREATE POLICY "Users can view their matches" ON matches
  FOR SELECT USING (
    (user1_id = auth.uid() OR user2_id = auth.uid()) 
    AND deleted_by IS NULL
  );

-- Allow users to soft delete their matches
CREATE POLICY "Users can soft delete their matches" ON matches
  FOR UPDATE USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );