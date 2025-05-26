/*
  # Add interests column to profiles table

  1. Changes
    - Add `interests` array column to `profiles` table to store user interests
    - Default to empty array
    - Allow null values

  2. Security
    - No additional security changes needed as the profiles table already has RLS policies
*/

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