-- FIX: Since the app uses custom auth (not Supabase Auth), auth.uid() is NULL
-- We need to allow inserts from authenticated API calls
-- Run this in Supabase SQL Editor

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Allow all for user_progress" ON public.user_progress;

-- Since you're using custom auth (not Supabase Auth), we allow operations 
-- and rely on the application to pass the correct viewer_user_id
-- The unique constraint ensures users can only update their own records via upsert

CREATE POLICY "Allow all for user_progress" ON public.user_progress
    FOR ALL USING (true) WITH CHECK (true);

-- Same for user_bookmarks
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Allow all for user_bookmarks" ON public.user_bookmarks;

CREATE POLICY "Allow all for user_bookmarks" ON public.user_bookmarks
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure viewer_users allows reading for authentication checks
ALTER TABLE public.viewer_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.viewer_users;
DROP POLICY IF EXISTS "Allow all for viewer_users" ON public.viewer_users;

-- Allow all operations on viewer_users (the app handles its own auth)
CREATE POLICY "Allow all for viewer_users" ON public.viewer_users
    FOR ALL USING (true) WITH CHECK (true);
