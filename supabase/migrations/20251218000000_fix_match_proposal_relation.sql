-- Fix match-proposal relation to prevent cascade delete
-- Allow multiple matches between same users for different proposals

-- 1. Drop existing foreign key constraint with CASCADE
ALTER TABLE matches 
  DROP CONSTRAINT IF EXISTS matches_proposal_id_fkey;

-- 2. Add new foreign key constraint with SET NULL instead of CASCADE
-- This way when proposal is deleted, match remains but proposal_id becomes null
ALTER TABLE matches 
  ADD CONSTRAINT matches_proposal_id_fkey 
  FOREIGN KEY (proposal_id) 
  REFERENCES proposals(id) 
  ON DELETE SET NULL;

-- 3. Make proposal_id nullable (it was NOT NULL before)
ALTER TABLE matches 
  ALTER COLUMN proposal_id DROP NOT NULL;

-- 4. Add proposal_name column to store proposal name even after proposal is deleted
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS proposal_name TEXT;

-- 5. Update existing matches to store proposal names
UPDATE matches m
SET proposal_name = p.activity_name
FROM proposals p
WHERE m.proposal_id = p.id AND m.proposal_name IS NULL;

-- 6. Remove unique constraint on user pairs (if exists)
-- This allows same users to match multiple times for different proposals
ALTER TABLE matches 
  DROP CONSTRAINT IF EXISTS matches_user1_id_user2_id_key;

-- 7. Add composite unique constraint: same users can't match for same proposal
-- But can match multiple times for different proposals
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_users_proposal 
  ON matches(user1_id, user2_id, proposal_id) 
  WHERE proposal_id IS NOT NULL;

-- 8. Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_proposal_id ON matches(proposal_id);

-- Note: Messages will still be tied to match_id, so they won't be deleted when proposal is deleted
