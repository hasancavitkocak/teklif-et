/*
  # Create Profiles Table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, user's display name)
      - `birth_date` (date, user's birthdate)
      - `gender` (text, user's gender)
      - `bio` (text, optional bio)
      - `city` (text, user's city)
      - `occupation` (text, optional occupation)
      - `education` (text, optional education)
      - `height` (integer, optional height in cm)
      - `drinking` (text, drinking preference)
      - `smoking` (text, smoking preference)
      - `exercise` (text, exercise frequency)
      - `religion` (text, optional religion)
      - `photos` (jsonb, array of photo URLs)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on profiles table
    - Users can read all profiles (for matching)
    - Users can only update their own profile
    - Users can only insert their own profile
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  birth_date date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  bio text DEFAULT '',
  city text DEFAULT '',
  occupation text DEFAULT '',
  education text DEFAULT '',
  height integer,
  drinking text DEFAULT 'occasionally' CHECK (drinking IN ('never', 'occasionally', 'socially', 'regularly')),
  smoking text DEFAULT 'never' CHECK (smoking IN ('never', 'occasionally', 'socially', 'regularly')),
  exercise text DEFAULT 'sometimes' CHECK (exercise IN ('never', 'sometimes', 'often', 'daily')),
  religion text DEFAULT '',
  photos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_city_idx ON profiles(city);
CREATE INDEX IF NOT EXISTS profiles_gender_idx ON profiles(gender);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at DESC);