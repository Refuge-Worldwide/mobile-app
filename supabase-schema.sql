-- This file contains the SQL schema for the show favorites feature.
-- SAFE TO RUN: This script is safe to run on an existing database.
-- It uses IF NOT EXISTS checks and will not overwrite existing tables or policies.

-- Create show_favorites table (only if it doesn't exist)
-- Uses show_id (immutable) instead of show_slug (can change)
CREATE TABLE IF NOT EXISTS public.show_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  show_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, show_id)
);

-- Enable Row Level Security (safe to run multiple times)
ALTER TABLE public.show_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts when re-running)
DROP POLICY IF EXISTS "Users can view their own show favorites" ON public.show_favorites;
DROP POLICY IF EXISTS "Users can insert their own show favorites" ON public.show_favorites;
DROP POLICY IF EXISTS "Users can delete their own show favorites" ON public.show_favorites;

-- Create policies
-- Users can only read their own show favorites
CREATE POLICY "Users can view their own show favorites"
  ON public.show_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own show favorites
CREATE POLICY "Users can insert their own show favorites"
  ON public.show_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own show favorites
CREATE POLICY "Users can delete their own show favorites"
  ON public.show_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS show_favorites_user_id_idx ON public.show_favorites(user_id);
CREATE INDEX IF NOT EXISTS show_favorites_show_id_idx ON public.show_favorites(show_id);

-- Verify the setup
SELECT 'Show favorites table created successfully!' AS status;
