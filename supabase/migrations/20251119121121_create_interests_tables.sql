/*
  # Create Interests Tables

  1. New Tables
    - `interests`
      - `id` (uuid, primary key)
      - `name` (text, interest name)
      - `category` (text, interest category)
      - `created_at` (timestamptz)
    
    - `user_interests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `interest_id` (uuid, foreign key to interests)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Users can read all interests
    - Users can only manage their own user_interests
  
  3. Sample Data
    - Insert popular Turkish interests across categories
*/

-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_interests junction table
CREATE TABLE IF NOT EXISTS user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interest_id uuid REFERENCES interests(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

-- Enable RLS
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Interests policies (everyone can read)
CREATE POLICY "Anyone can read interests"
  ON interests FOR SELECT
  TO authenticated
  USING (true);

-- User interests policies
CREATE POLICY "Users can read their own interests"
  ON user_interests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interests"
  ON user_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests"
  ON user_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert sample interests
INSERT INTO interests (name, category) VALUES
  ('Futbol', 'Spor'),
  ('Basketbol', 'Spor'),
  ('Yüzme', 'Spor'),
  ('Voleybol', 'Spor'),
  ('Tenis', 'Spor'),
  ('Yoga', 'Spor'),
  ('Fitness', 'Spor'),
  ('Koşu', 'Spor'),
  
  ('Sinema', 'Eğlence'),
  ('Müzik', 'Eğlence'),
  ('Dans', 'Eğlence'),
  ('Tiyatro', 'Eğlence'),
  ('Konser', 'Eğlence'),
  ('Gitar', 'Eğlence'),
  ('Piyano', 'Eğlence'),
  
  ('Seyahat', 'Yaşam Tarzı'),
  ('Kamp', 'Yaşam Tarzı'),
  ('Doğa Yürüyüşü', 'Yaşam Tarzı'),
  ('Fotoğrafçılık', 'Yaşam Tarzı'),
  ('Yemek Yapmak', 'Yaşam Tarzı'),
  ('Kahve', 'Yaşam Tarzı'),
  ('Kitap Okuma', 'Yaşam Tarzı'),
  ('Yazma', 'Yaşam Tarzı'),
  
  ('Teknoloji', 'İlgi Alanları'),
  ('Oyun', 'İlgi Alanları'),
  ('Sanat', 'İlgi Alanları'),
  ('Moda', 'İlgi Alanları'),
  ('Tasarım', 'İlgi Alanları'),
  ('Girişimcilik', 'İlgi Alanları'),
  ('Yatırım', 'İlgi Alanları'),
  ('Podcast', 'İlgi Alanları')
ON CONFLICT DO NOTHING;