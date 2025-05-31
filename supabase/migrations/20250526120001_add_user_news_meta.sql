/*
  # Add user_news_meta table for storing per-user news item metadata

  1. Changes
    - Create user_news_meta table for storing bookmarks and playlist status
    - Add necessary indexes and foreign key constraints
    - Add RLS policies for user access

  2. Security
    - Enable RLS
    - Add policies for users to manage their own meta data
*/

-- Create user_news_meta table
CREATE TABLE IF NOT EXISTS user_news_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  news_id TEXT NOT NULL,
  bookmarked BOOLEAN DEFAULT false,
  in_playlist BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, news_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_news_meta_user_id ON user_news_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_meta_news_id ON user_news_meta(news_id);
CREATE INDEX IF NOT EXISTS idx_user_news_meta_bookmarked ON user_news_meta(bookmarked) WHERE bookmarked = true;
CREATE INDEX IF NOT EXISTS idx_user_news_meta_in_playlist ON user_news_meta(in_playlist) WHERE in_playlist = true;

-- Enable RLS
ALTER TABLE user_news_meta ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own news meta"
  ON user_news_meta
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own news meta"
  ON user_news_meta
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own news meta"
  ON user_news_meta
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own news meta"
  ON user_news_meta
  FOR DELETE
  USING (auth.uid() = user_id); 