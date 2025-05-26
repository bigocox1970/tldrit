/*
  # Fix schema issues for news feed functionality

  1. Changes
    - Add missing `is_premium` column to profiles table
    - Add missing `eli5_age` column to profiles table (if not exists)
    - Ensure all necessary columns exist for proper news feed functionality

  2. Security
    - No additional security changes needed as the profiles table already has RLS policies
*/

-- Add is_premium column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add eli5_age column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'eli5_age'
  ) THEN
    ALTER TABLE profiles ADD COLUMN eli5_age INTEGER DEFAULT 5;
  END IF;
END $$;

-- Ensure interests column exists (should already exist from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'interests'
  ) THEN
    ALTER TABLE profiles ADD COLUMN interests text[] DEFAULT '{}';
  END IF;
END $$;
