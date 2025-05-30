-- First drop any existing policies and functions
DROP POLICY IF EXISTS "Allow anyone to read example summaries" ON summaries;
DROP FUNCTION IF EXISTS public.get_example_user_id();

-- Create function to get example user ID
CREATE OR REPLACE FUNCTION public.get_example_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = 'no-reply@tldrit.app';
$$;

-- Create policy to allow anyone to read example summaries
CREATE POLICY "Allow anyone to read example summaries"
  ON summaries
  FOR SELECT
  USING (
    user_id = get_example_user_id()
  ); 