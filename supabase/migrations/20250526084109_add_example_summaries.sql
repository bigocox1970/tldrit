-- Create example_summaries table
CREATE TABLE public.example_summaries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  summary text NOT NULL,
  audio_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policy to allow anyone to read example summaries
ALTER TABLE public.example_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to read example summaries"
  ON public.example_summaries
  FOR SELECT
  USING (true); 