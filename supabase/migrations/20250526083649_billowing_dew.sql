/*
  # Initial schema setup for TLDRit

  1. New Tables
    - `profiles`: User profile data
    - `summaries`: Stored user summaries
    - `news`: News items for the feed
    - `interests`: Available interest categories
    
  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  original_content TEXT NOT NULL,
  summary TEXT NOT NULL,
  is_eli5 BOOLEAN DEFAULT false,
  summary_level INTEGER DEFAULT 3,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create news table
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT now(),
  image_url TEXT,
  audio_url TEXT
);

-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

-- Insert default interests
INSERT INTO interests (name) VALUES
  ('technology'),
  ('world'),
  ('business'),
  ('science'),
  ('health'),
  ('entertainment'),
  ('sports'),
  ('politics'),
  ('crypto'),
  ('ai')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Summaries policies
CREATE POLICY "Users can view their own summaries"
  ON summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries"
  ON summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
  ON summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries"
  ON summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- News policies (read-only for users)
CREATE POLICY "Anyone can view news"
  ON news
  FOR SELECT
  TO authenticated
  USING (true);

-- Interests policies (read-only for users)
CREATE POLICY "Anyone can view interests"
  ON interests
  FOR SELECT
  USING (true);

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();