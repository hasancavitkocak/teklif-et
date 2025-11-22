/*
  # Update Gender Constraint
  
  1. Changes
    - Delete all existing profiles with invalid gender values
    - Drop existing gender check constraint
    - Add new constraint with only 3 options: male, female, prefer_not_to_say
  
  2. Reason
    - Allow users to select "Belirtmek İstemiyorum" option during onboarding
*/

-- Delete all profiles with 'other' gender value
DELETE FROM profiles WHERE gender = 'other';

-- Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;

-- Add new constraint with 3 options only
ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check 
  CHECK (gender IN ('male', 'female', 'prefer_not_to_say'));
