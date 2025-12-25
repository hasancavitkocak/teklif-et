-- Add archived_hidden_by column to matches table for user-specific archive hiding

-- 1. Add the new column as JSON array to store multiple user IDs
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS archived_hidden_by UUID[];

-- 2. Add comment for documentation
COMMENT ON COLUMN matches.archived_hidden_by IS 'Array of user IDs who have hidden this archived match from their view';

-- 3. Add index for better performance when querying
CREATE INDEX IF NOT EXISTS idx_matches_archived_hidden_by ON matches USING GIN (archived_hidden_by);

-- 4. Update existing RLS policies (no changes needed as existing policies cover this column)