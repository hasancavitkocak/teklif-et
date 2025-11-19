/*
  # Add Proposal Detail Fields

  ## Overview
  Adds additional fields to proposals for better activity planning.

  ## Changes
  - Add `location_name` for specific venue/place name
  - Add `participant_count` for number of people needed
  - Add `is_group` to indicate if it's a group activity
  - Add `date_time` for when the activity will happen
  - Add `description` for additional details

  ## Notes
  - All fields are optional to maintain backward compatibility
  - Existing proposals will have NULL values for new fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'location_name'
  ) THEN
    ALTER TABLE proposals ADD COLUMN location_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'participant_count'
  ) THEN
    ALTER TABLE proposals ADD COLUMN participant_count integer DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'is_group'
  ) THEN
    ALTER TABLE proposals ADD COLUMN is_group boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'date_time'
  ) THEN
    ALTER TABLE proposals ADD COLUMN date_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'description'
  ) THEN
    ALTER TABLE proposals ADD COLUMN description text;
  END IF;
END $$;