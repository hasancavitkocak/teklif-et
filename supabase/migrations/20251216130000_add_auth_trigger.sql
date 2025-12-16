/*
  # Add Auth Trigger for Profile Creation

  ## Overview
  Adds trigger to automatically create profile when user signs up

  ## Changes
  - Create handle_new_user function
  - Add trigger on auth.users insert
*/

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new profile with minimal required fields
  INSERT INTO public.profiles (
    id,
    name,
    birth_date,
    gender
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Yeni Kullanıcı'),
    COALESCE((NEW.raw_user_meta_data->>'birth_date')::date, '1990-01-01'::date),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'prefer_not_to_say')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers that might conflict
DROP TRIGGER IF EXISTS trigger_set_default_credits ON profiles;
DROP TRIGGER IF EXISTS trigger_set_default_invitation_credits ON profiles;

-- Drop old trigger functions
DROP FUNCTION IF EXISTS set_default_credits();
DROP FUNCTION IF EXISTS set_default_invitation_credits();

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();