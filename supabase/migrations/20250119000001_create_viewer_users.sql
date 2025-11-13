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
CREATE INDEX idx_viewer_users_email ON public.viewer_users(email);
CREATE INDEX idx_viewer_users_username ON public.viewer_users(username);

-- Enable RLS
ALTER TABLE public.viewer_users ENABLE ROW LEVEL SECURITY;

-- Policies for viewer_users
-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.viewer_users
  FOR SELECT
  USING (auth.uid()::text = id::text OR true); -- Allow public read for profile lookups

-- Users can update their own data
CREATE POLICY "Users can update own profile"
  ON public.viewer_users
  FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Anyone can insert (register)
CREATE POLICY "Anyone can register"
  ON public.viewer_users
  FOR INSERT
  WITH CHECK (true);

-- Update user_profiles to link with viewer_users
-- First, we need to make id not strictly reference auth.users for viewer users
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
CREATE TRIGGER on_viewer_user_created
  AFTER INSERT ON public.viewer_users
  FOR EACH ROW
  EXECUTE FUNCTION create_viewer_user_profile();
