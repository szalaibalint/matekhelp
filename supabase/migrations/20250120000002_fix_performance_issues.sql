-- Migration: Fix Performance Issues
-- Date: 2025-01-20
-- Description: Fixes RLS auth function re-evaluation, removes duplicate policies, adds missing indexes

-- ============================================
-- PART 1: Fix auth_rls_initplan issues
-- Replace auth.uid() with (select auth.uid()) in RLS policies
-- ============================================

-- users table (if it exists)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        EXECUTE 'CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (id = (select auth.uid()))';
    END IF;
END $$;

-- presentations table
DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
-- Create single unified policy for SELECT (handles both anon viewing published and auth viewing all)
CREATE POLICY "Anyone can view presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);
-- Authenticated users can do all operations
CREATE POLICY "Authenticated users can manage presentations" ON public.presentations
    FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- slides table
DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
-- Single policy: anyone can view, authenticated can manage
CREATE POLICY "Anyone can view slides" ON public.slides
    FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage slides" ON public.slides
    FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- categories table
DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
-- Single policy: anyone can view, authenticated can manage
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage categories" ON public.categories
    FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- presentation_sessions table
DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;
-- Combine into single SELECT policy
CREATE POLICY "Users can view sessions" ON public.presentation_sessions
    FOR SELECT USING (
        user_id = (select auth.uid()) 
        OR user_id IS NULL 
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can update own sessions" ON public.presentation_sessions;
CREATE POLICY "Users can update own sessions" ON public.presentation_sessions
    FOR UPDATE USING (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
-- Single INSERT policy
CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions
    FOR INSERT WITH CHECK (TRUE);

-- presentation_ratings table
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.presentation_ratings;
CREATE POLICY "Authenticated users can create ratings" ON public.presentation_ratings
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own ratings" ON public.presentation_ratings;
CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
    FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ratings" ON public.presentation_ratings;
CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
    FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can rate presentations" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can view own ratings" ON public.presentation_ratings;

-- user_bookmarks table
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
    FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;

-- search_history table
DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
CREATE POLICY "Users can view own search history" ON public.search_history
    FOR SELECT USING (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
CREATE POLICY "Users can create search history" ON public.search_history
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Anyone can create search history" ON public.search_history;

-- daily_statistics table
DROP POLICY IF EXISTS "Admins can manage statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Anyone can view daily statistics" ON public.daily_statistics;
-- Single SELECT policy for viewing
CREATE POLICY "Anyone can view daily statistics" ON public.daily_statistics
    FOR SELECT USING (TRUE);
-- Separate policy for admin management (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage statistics" ON public.daily_statistics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = (select auth.uid()) AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = (select auth.uid()) AND role = 'admin'
        )
    );

-- user_profiles table (id is the primary key, references auth.users)
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (id = (select auth.uid()));

-- achievements table
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
-- Single SELECT policy for viewing
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (TRUE);
-- Separate policy for admin management (INSERT, UPDATE, DELETE only)
CREATE POLICY "Admins can manage achievements" ON public.achievements
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can update achievements" ON public.achievements
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can delete achievements" ON public.achievements
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- user_achievements table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (user_id = (select auth.uid()));

-- notifications table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (select auth.uid()));

-- user_learning_paths table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Users can view own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can view own learning paths" ON public.user_learning_paths
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can create own learning paths" ON public.user_learning_paths
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can update own learning paths" ON public.user_learning_paths
    FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can delete own learning paths" ON public.user_learning_paths
    FOR DELETE USING (user_id = (select auth.uid()));

-- presentation_comments table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.presentation_comments;
CREATE POLICY "Authenticated users can create comments" ON public.presentation_comments
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.presentation_comments;
CREATE POLICY "Users can delete own comments" ON public.presentation_comments
    FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create comments" ON public.presentation_comments;

DROP POLICY IF EXISTS "Users can update own comments" ON public.presentation_comments;
CREATE POLICY "Users can update own comments" ON public.presentation_comments
    FOR UPDATE USING (user_id = (select auth.uid()));

-- quiz_questions table
DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
-- Single SELECT policy
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
    FOR SELECT USING (TRUE);
-- Separate policies for authenticated management
CREATE POLICY "Authenticated users can insert quiz questions" ON public.quiz_questions
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update quiz questions" ON public.quiz_questions
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete quiz questions" ON public.quiz_questions
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- media_files table
DROP POLICY IF EXISTS "Authenticated users can manage media files" ON public.media_files;
DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
-- Single SELECT policy
CREATE POLICY "Anyone can view media files" ON public.media_files
    FOR SELECT USING (TRUE);
-- Separate policies for authenticated management
CREATE POLICY "Authenticated users can insert media files" ON public.media_files
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update media files" ON public.media_files
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete media files" ON public.media_files
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- viewer_users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
CREATE POLICY "Users can view own profile" ON public.viewer_users
    FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
CREATE POLICY "Users can update own profile" ON public.viewer_users
    FOR UPDATE USING (id = (select auth.uid()));

-- user_progress table
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- PART 2: Remove remaining duplicate permissive policies
-- These policies exist from previous migrations and cause duplicates
-- ============================================

-- Drop duplicates that may exist from earlier migrations
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;

-- ============================================
-- PART 3: Add missing indexes for foreign keys
-- ============================================

-- media_files.uploaded_by
CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by 
    ON public.media_files(uploaded_by);

-- presentation_comments.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_presentation_comments_viewer_user_id 
    ON public.presentation_comments(viewer_user_id);

-- presentation_ratings.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_presentation_ratings_viewer_user_id 
    ON public.presentation_ratings(viewer_user_id);

-- presentation_sessions.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_viewer_user_id 
    ON public.presentation_sessions(viewer_user_id);

-- search_history.clicked_presentation_id
CREATE INDEX IF NOT EXISTS idx_search_history_clicked_presentation_id 
    ON public.search_history(clicked_presentation_id);

-- search_history.user_id
CREATE INDEX IF NOT EXISTS idx_search_history_user_id 
    ON public.search_history(user_id);

-- search_history.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_search_history_viewer_user_id 
    ON public.search_history(viewer_user_id);

-- user_bookmarks.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_viewer_user_id 
    ON public.user_bookmarks(viewer_user_id);

-- ============================================
-- PART 4: Note about unused indexes
-- These indexes are flagged as unused but may be needed in the future.
-- Keeping them for now as they don't significantly impact write performance.
-- Monitor usage over time before removing.
-- ============================================

-- Unused indexes (kept for future use):
-- idx_presentations_display_order
-- idx_quiz_questions_quiz_id
-- idx_quiz_questions_sort_order
-- idx_user_profiles_username
-- idx_user_profiles_role
-- idx_user_achievements_user_id
-- idx_user_achievements_achievement_id
-- idx_notifications_is_read
-- idx_notifications_user_id
-- idx_user_learning_paths_user_id
-- idx_presentation_comments_user_id
-- idx_presentation_comments_parent_id
-- idx_presentations_view_count
-- idx_presentations_updated_at
-- idx_presentations_status
-- idx_presentations_created_by
-- idx_slides_sort_order
-- idx_categories_parent_id
-- idx_presentations_category_id
-- idx_presentation_sessions_user_id
-- idx_presentation_sessions_started_at
-- idx_presentation_sessions_completed
-- idx_presentation_ratings_user_id
-- idx_presentation_ratings_rating
-- idx_user_bookmarks_user_id
-- idx_user_progress_user_id
-- idx_user_progress_presentation_id
-- idx_search_history_search_query
-- idx_search_history_created_at
-- idx_category_views_category_id
-- idx_presentations_tags
-- idx_presentations_difficulty
-- idx_presentations_featured
-- idx_presentations_completion_count
-- idx_presentations_average_score
-- idx_viewer_users_email
-- idx_viewer_users_username
-- idx_user_profiles_viewer_user_id
-- idx_categories_sort_order
