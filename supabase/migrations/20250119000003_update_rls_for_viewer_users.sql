-- Update RLS policies for user_progress to allow viewer users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

-- Create new policies that support both auth users and viewer users
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

-- Similar updates for other tables that viewer users interact with

-- presentation_sessions
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
CREATE POLICY "Users can create sessions" ON public.presentation_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_ratings
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

-- user_bookmarks
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.user_bookmarks
  FOR ALL
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- search_history
DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
CREATE POLICY "Users can create search history" ON public.search_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_comments
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
