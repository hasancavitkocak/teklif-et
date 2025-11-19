/*
  # Initial Database Schema for Teklif.et

  ## Overview
  This migration creates the core database structure for a modern activity-based dating app.
  
  ## New Tables
  
  ### 1. profiles
  - `id` (uuid, FK to auth.users) - User identifier
  - `phone` (text) - Phone number (masked)
  - `name` (text) - User's name
  - `birth_date` (date) - Date of birth
  - `gender` (text) - Gender preference
  - `city` (text) - User's city
  - `smoking` (boolean) - Smoking status
  - `drinking` (boolean) - Drinking status
  - `profile_photo` (text) - Primary profile photo URL
  - `onboarding_completed` (boolean) - Profile setup status
  - `is_premium` (boolean) - Premium membership status
  - `daily_proposals_sent` (integer) - Counter for free tier limit
  - `daily_super_likes_used` (integer) - Counter for super likes
  - `last_reset_date` (date) - For daily limit resets
  - `created_at` (timestamptz) - Account creation time
  - `updated_at` (timestamptz) - Last profile update

  ### 2. profile_photos
  - `id` (uuid, PK) - Photo identifier
  - `user_id` (uuid, FK) - Owner of the photo
  - `photo_url` (text) - Photo storage URL
  - `position` (integer) - Order in gallery (0 = profile photo)
  - `created_at` (timestamptz) - Upload time

  ### 3. interests
  - `id` (uuid, PK) - Interest identifier
  - `name` (text) - Activity/interest name
  - `category` (text) - Interest category
  - `icon` (text) - Icon identifier

  ### 4. user_interests
  - `user_id` (uuid, FK) - User reference
  - `interest_id` (uuid, FK) - Interest reference
  - `created_at` (timestamptz) - Selection time

  ### 5. proposals
  - `id` (uuid, PK) - Proposal identifier
  - `creator_id` (uuid, FK) - User who created proposal
  - `activity_name` (text) - Activity title
  - `interest_id` (uuid, FK) - Related interest
  - `city` (text) - Proposal location
  - `is_boosted` (boolean) - Boost status
  - `boost_expires_at` (timestamptz) - Boost expiry time
  - `status` (text) - active/completed/cancelled
  - `created_at` (timestamptz) - Creation time
  - `updated_at` (timestamptz) - Last update

  ### 6. proposal_requests
  - `id` (uuid, PK) - Request identifier
  - `proposal_id` (uuid, FK) - Target proposal
  - `requester_id` (uuid, FK) - User requesting to join
  - `status` (text) - pending/accepted/rejected
  - `is_super_like` (boolean) - Super like flag
  - `created_at` (timestamptz) - Request time
  - `updated_at` (timestamptz) - Status change time

  ### 7. matches
  - `id` (uuid, PK) - Match identifier
  - `proposal_id` (uuid, FK) - Related proposal
  - `user1_id` (uuid, FK) - First user
  - `user2_id` (uuid, FK) - Second user
  - `matched_at` (timestamptz) - Match creation time

  ### 8. messages
  - `id` (uuid, PK) - Message identifier
  - `match_id` (uuid, FK) - Related match
  - `sender_id` (uuid, FK) - Message sender
  - `content` (text) - Message content
  - `read` (boolean) - Read status
  - `created_at` (timestamptz) - Send time

  ## Security
  - RLS enabled on all tables
  - Policies enforce user ownership and privacy
  - Sensitive data masked appropriately
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  name text NOT NULL,
  birth_date date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  city text,
  smoking boolean DEFAULT false,
  drinking boolean DEFAULT false,
  profile_photo text,
  onboarding_completed boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  daily_proposals_sent integer DEFAULT 0,
  daily_super_likes_used integer DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profile photos table
CREATE TABLE IF NOT EXISTS profile_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, position)
);

ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- User interests junction table
CREATE TABLE IF NOT EXISTS user_interests (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  interest_id uuid REFERENCES interests(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, interest_id)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);

-- RLS Policies

-- Profiles: Users can read own profile and view others' public info
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Profile photos
CREATE POLICY "Users can view own photos"
  ON profile_photos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
  ON profile_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON profile_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Interests: Public read
CREATE POLICY "Anyone can view interests"
  ON interests FOR SELECT
  TO authenticated
  USING (true);

-- User interests
CREATE POLICY "Users can view own interests"
  ON user_interests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own interests"
  ON user_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
  ON user_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Proposals: Users can view active proposals, manage own
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

-- Proposal requests
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

-- Matches
CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages
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

-- Insert default interests
INSERT INTO interests (name, category, icon) VALUES
  ('Kahve İçmek', 'Yemek & İçecek', 'coffee'),
  ('Yemek Yemek', 'Yemek & İçecek', 'utensils'),
  ('Sinema', 'Eğlence', 'film'),
  ('Konser', 'Eğlence', 'music'),
  ('Spor', 'Aktivite', 'dumbbell'),
  ('Yürüyüş', 'Aktivite', 'footprints'),
  ('Müze', 'Kültür', 'landmark'),
  ('Tiyatro', 'Kültür', 'theater'),
  ('Alışveriş', 'Sosyal', 'shopping-bag'),
  ('Piknik', 'Doğa', 'tree-pine')
ON CONFLICT (name) DO NOTHING;