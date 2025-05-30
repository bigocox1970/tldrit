-- Create function to get user ID by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = p_email;
$$;

-- Create policy to allow reading profile IDs by email
CREATE POLICY "Allow reading profile IDs by email"
  ON profiles
  FOR SELECT
  USING (true); 