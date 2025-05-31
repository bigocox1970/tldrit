/*
  # Add url_hash column to news table

  1. Changes
    - Add url_hash column to news table
    - Create unique index on url_hash
    - Add url_hash to existing rows based on source_url
*/

-- Add url_hash column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'news' 
    AND column_name = 'url_hash'
  ) THEN
    ALTER TABLE news ADD COLUMN url_hash TEXT;
    
    -- Update existing rows with url_hash based on source_url
    UPDATE news 
    SET url_hash = encode(digest(source_url, 'md5'), 'hex')
    WHERE url_hash IS NULL;
    
    -- Make url_hash NOT NULL after populating existing rows
    ALTER TABLE news ALTER COLUMN url_hash SET NOT NULL;
    
    -- Create unique index on url_hash
    CREATE UNIQUE INDEX IF NOT EXISTS idx_news_url_hash ON news(url_hash);
  END IF;
END $$; 