/*
  # Add is_viewed column to user_interactions table
  
  1. Changes
    - Add is_viewed boolean column to user_interactions table
    - Default value is false (not viewed)
    - Add index for better performance
*/

-- Add is_viewed column to user_interactions table
ALTER TABLE user_interactions 
ADD COLUMN IF NOT EXISTS is_viewed boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_viewed 
ON user_interactions(is_viewed, interaction_type);

-- Add index for notification queries with proposals join
CREATE INDEX IF NOT EXISTS idx_user_interactions_notifications 
ON user_interactions(proposal_id, interaction_type, is_viewed, created_at);