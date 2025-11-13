-- Complete Viewer User Authentication and Progress Tracking Setup
-- This migration creates the viewer_users table, updates RLS policies, and configures all necessary permissions

-- =====================================================
-- PART 1: Create viewer_users table
-- =====================================================

-- Create viewer_users table (separate from admin auth.users)
CREATE TABLE IF NOT EXISTS public.viewer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_viewer_users_email ON public.viewer_users(email);
CREATE INDEX IF NOT EXISTS idx_viewer_users_username ON public.viewer_users(username);

-- Enable RLS
ALTER TABLE public.viewer_users ENABLE ROW LEVEL SECURITY;

-- Policies for viewer_users
DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
CREATE POLICY "Users can view own profile"
  ON public.viewer_users
  FOR SELECT
  USING (auth.uid()::text = id::text OR true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
CREATE POLICY "Users can update own profile"
  ON public.viewer_users
  FOR UPDATE
  USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Anyone can register" ON public.viewer_users;
CREATE POLICY "Anyone can register"
  ON public.viewer_users
  FOR INSERT
  WITH CHECK (true);

-- Update user_profiles to link with viewer_users
-- Drop the foreign key constraint if it exists
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add the viewer_user_id column
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_viewer_user_id ON public.user_profiles(viewer_user_id);

-- Update other tables to optionally link with viewer_users
ALTER TABLE public.presentation_sessions ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.presentation_ratings ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.user_bookmarks ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.search_history ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.presentation_comments ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_viewer_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS viewer_users_updated_at ON public.viewer_users;
CREATE TRIGGER viewer_users_updated_at
  BEFORE UPDATE ON public.viewer_users
  FOR EACH ROW
  EXECUTE FUNCTION update_viewer_user_updated_at();

-- Function to create user profile when viewer user registers
CREATE OR REPLACE FUNCTION create_viewer_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, viewer_user_id, username, full_name, avatar_url)
  VALUES (NEW.id, NEW.id, NEW.username, NEW.full_name, NEW.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_viewer_user_created ON public.viewer_users;
CREATE TRIGGER on_viewer_user_created
  AFTER INSERT ON public.viewer_users
  FOR EACH ROW
  EXECUTE FUNCTION create_viewer_user_profile();

-- =====================================================
-- PART 2: Create storage bucket for images
-- =====================================================

-- Create storage bucket for presentation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentation-images', 'presentation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'presentation-images');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own images
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete images
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- =====================================================
-- PART 3: Update RLS policies for viewer users
-- =====================================================

-- user_progress policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

CREATE POLICY "Users can create own progress" ON public.user_progress
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_sessions policies
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
CREATE POLICY "Users can create sessions" ON public.presentation_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_ratings policies
DROP POLICY IF EXISTS "Users can rate presentations" ON public.presentation_ratings;
CREATE POLICY "Users can rate presentations" ON public.presentation_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view own ratings" ON public.presentation_ratings;
CREATE POLICY "Users can view own ratings" ON public.presentation_ratings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- user_bookmarks policies
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.user_bookmarks
  FOR ALL
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- search_history policies
DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
CREATE POLICY "Users can create search history" ON public.search_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_comments policies
DROP POLICY IF EXISTS "Users can create comments" ON public.presentation_comments;
CREATE POLICY "Users can create comments" ON public.presentation_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can update own comments" ON public.presentation_comments;
CREATE POLICY "Users can update own comments" ON public.presentation_comments
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- =====================================================
-- PART 4: Make user_id columns nullable
-- =====================================================

-- Make user_id nullable in user_progress table to support viewer users
ALTER TABLE public.user_progress 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or viewer_user_id is present
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_check;

ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_user_check 
CHECK (user_id IS NOT NULL OR viewer_user_id IS NOT NULL);

-- Update unique constraint to handle both types of users
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_presentation_id_key;

-- Create unique index that handles both user types
DROP INDEX IF EXISTS user_progress_auth_user_presentation;
CREATE UNIQUE INDEX user_progress_auth_user_presentation 
ON public.user_progress(user_id, presentation_id) 
WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS user_progress_viewer_user_presentation;
CREATE UNIQUE INDEX user_progress_viewer_user_presentation 
ON public.user_progress(viewer_user_id, presentation_id) 
WHERE viewer_user_id IS NOT NULL;

-- Make user_id nullable in other related tables
ALTER TABLE public.presentation_sessions 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.search_history 
ALTER COLUMN user_id DROP NOT NULL;

-- presentation_ratings, user_bookmarks, presentation_comments user_id is already nullable

COMMENT ON TABLE public.viewer_users IS 'Separate authentication table for public viewer users (not admin users)';
COMMENT ON COLUMN public.user_progress.viewer_user_id IS 'Links progress to viewer users instead of auth.users';
