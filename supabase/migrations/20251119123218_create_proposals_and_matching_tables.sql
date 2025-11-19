/*
  # Create Proposals and Matching System Tables

  ## Overview
  This migration creates the core matching system tables for the dating app.

  ## New Tables

  ### 1. proposals
  - `id` (uuid, PK) - Proposal identifier
  - `creator_id` (uuid, FK) - User who created the proposal
  - `activity_name` (text) - Activity title/description
  - `interest_id` (uuid, FK) - Related interest category
  - `city` (text) - Proposal location
  - `is_boosted` (boolean) - Boost status for visibility
  - `boost_expires_at` (timestamptz) - When boost expires
  - `status` (text) - active/completed/cancelled
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. proposal_requests
  - `id` (uuid, PK) - Request identifier
  - `proposal_id` (uuid, FK) - Target proposal
  - `requester_id` (uuid, FK) - User requesting to join
  - `status` (text) - pending/accepted/rejected
  - `is_super_like` (boolean) - Super like flag
  - `created_at` (timestamptz) - Request timestamp
  - `updated_at` (timestamptz) - Status change timestamp

  ### 3. matches
  - `id` (uuid, PK) - Match identifier
  - `proposal_id` (uuid, FK) - Related proposal
  - `user1_id` (uuid, FK) - First user
  - `user2_id` (uuid, FK) - Second user
  - `matched_at` (timestamptz) - Match creation timestamp

  ### 4. messages
  - `id` (uuid, PK) - Message identifier
  - `match_id` (uuid, FK) - Related match
  - `sender_id` (uuid, FK) - Message sender
  - `content` (text) - Message content
  - `read` (boolean) - Read status
  - `created_at` (timestamptz) - Send timestamp

  ## Security
  - RLS enabled on all tables
  - Users can view active proposals
  - Users can only manage their own proposals and requests
  - Match participants can view and send messages
*/

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_name text NOT NULL,
  interest_id uuid REFERENCES interests(id) ON DELETE SET NULL,
  city text NOT NULL,
  is_boosted boolean DEFAULT false,
  boost_expires_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proposals_creator ON proposals(creator_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_boosted ON proposals(is_boosted, boost_expires_at) WHERE is_boosted = true;

-- Proposal requests table
CREATE TABLE IF NOT EXISTS proposal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  is_super_like boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id, requester_id)
);

ALTER TABLE proposal_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proposal_requests_proposal ON proposal_requests(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_requests_requester ON proposal_requests(requester_id);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  matched_at timestamptz DEFAULT now(),
  CHECK (user1_id < user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);

-- RLS Policies for Proposals
CREATE POLICY "Users can view active proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (status = 'active' OR auth.uid() = creator_id);

CREATE POLICY "Users can create proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete own proposals"
  ON proposals FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- RLS Policies for Proposal Requests
CREATE POLICY "Users can view requests for own proposals"
  ON proposal_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT creator_id FROM proposals WHERE id = proposal_id
    ) OR auth.uid() = requester_id
  );

CREATE POLICY "Users can create requests"
  ON proposal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Proposal creators can update requests"
  ON proposal_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT creator_id FROM proposals WHERE id = proposal_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT creator_id FROM proposals WHERE id = proposal_id
    )
  );

-- RLS Policies for Matches
CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for Messages
CREATE POLICY "Users can view messages in own matches"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (auth.uid() = user1_id OR auth.uid() = user2_id)
    )
  );

CREATE POLICY "Users can send messages in own matches"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (auth.uid() = user1_id OR auth.uid() = user2_id)
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (auth.uid() = user1_id OR auth.uid() = user2_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (auth.uid() = user1_id OR auth.uid() = user2_id)
    )
  );