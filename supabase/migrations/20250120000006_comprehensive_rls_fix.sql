-- Migration: Comprehensive RLS Policy Fix
-- Date: 2025-01-20
-- Description: Fixes all RLS policies to properly support viewer users

-- ============================================
-- PART 1: user_progress table
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

-- Create proper policies for viewer users
-- SELECT: Users can view their own progress
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- INSERT: Users can create progress where viewer_user_id matches their auth.uid()
CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- UPDATE: Users can update their own progress
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 2: user_bookmarks table
-- ============================================

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;

CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 3: presentation_sessions table
-- ============================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can view sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;

-- Anyone can create sessions (for anonymous tracking too)
CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions
    FOR INSERT WITH CHECK (TRUE);

-- Users can view their own sessions or anonymous sessions
CREATE POLICY "Users can view own sessions" ON public.presentation_sessions
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
        OR (user_id IS NULL AND viewer_user_id IS NULL)
    );

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON public.presentation_sessions
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
        OR (user_id IS NULL AND viewer_user_id IS NULL)
    );

-- ============================================
-- PART 4: presentation_ratings table
-- ============================================

DROP POLICY IF EXISTS "Users can create ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can rate presentations" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can view own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.presentation_ratings;

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings" ON public.presentation_ratings
    FOR SELECT USING (TRUE);

-- Users can create ratings
CREATE POLICY "Users can create ratings" ON public.presentation_ratings
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 5: presentation_comments table
-- ============================================

DROP POLICY IF EXISTS "Anyone can view comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.presentation_comments;

-- Anyone can view comments
CREATE POLICY "Anyone can view comments" ON public.presentation_comments
    FOR SELECT USING (TRUE);

-- Users can create comments
CREATE POLICY "Users can create comments" ON public.presentation_comments
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.presentation_comments
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.presentation_comments
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 6: search_history table
-- ============================================

DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
DROP POLICY IF EXISTS "Anyone can create search history" ON public.search_history;

-- Anyone can create search history (for analytics)
CREATE POLICY "Anyone can create search history" ON public.search_history
    FOR INSERT WITH CHECK (TRUE);

-- Users can view their own search history
CREATE POLICY "Users can view own search history" ON public.search_history
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
        OR (user_id IS NULL AND viewer_user_id IS NULL)
    );

-- ============================================
-- PART 7: viewer_users table
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.viewer_users;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.viewer_users
    FOR SELECT USING (id = (select auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.viewer_users
    FOR UPDATE USING (id = (select auth.uid()));

-- Users can insert their own profile (for new user creation)
CREATE POLICY "Users can insert own profile" ON public.viewer_users
    FOR INSERT WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PART 8: user_profiles table
-- ============================================

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Anyone can view profiles (for leaderboards, etc.)
CREATE POLICY "Anyone can view profiles" ON public.user_profiles
    FOR SELECT USING (TRUE);

-- Users can create their own profile
CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (
        id = (select auth.uid())
        OR viewer_user_id = (select auth.uid())
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (
        id = (select auth.uid())
        OR viewer_user_id = (select auth.uid())
    );

-- ============================================
-- PART 9: user_achievements table
-- ============================================

DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (user_id = (select auth.uid()));

-- ============================================
-- PART 10: notifications table
-- ============================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- PART 11: user_learning_paths table
-- ============================================

DROP POLICY IF EXISTS "Users can view own learning paths" ON public.user_learning_paths;
DROP POLICY IF EXISTS "Users can create own learning paths" ON public.user_learning_paths;
DROP POLICY IF EXISTS "Users can update own learning paths" ON public.user_learning_paths;
DROP POLICY IF EXISTS "Users can delete own learning paths" ON public.user_learning_paths;

CREATE POLICY "Users can view own learning paths" ON public.user_learning_paths
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own learning paths" ON public.user_learning_paths
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own learning paths" ON public.user_learning_paths
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own learning paths" ON public.user_learning_paths
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- PART 12: Public read access tables
-- ============================================

-- presentations
DROP POLICY IF EXISTS "Anyone can view presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can manage presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can insert presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can update presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can delete presentations" ON public.presentations;

CREATE POLICY "Anyone can view published presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert presentations" ON public.presentations
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update presentations" ON public.presentations
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete presentations" ON public.presentations
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- slides
DROP POLICY IF EXISTS "Anyone can view slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can manage slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can insert slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can update slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can delete slides" ON public.slides;

CREATE POLICY "Anyone can view slides" ON public.slides
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert slides" ON public.slides
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update slides" ON public.slides
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete slides" ON public.slides
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert categories" ON public.categories
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update categories" ON public.categories
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories" ON public.categories
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- achievements
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can insert achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can update achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can delete achievements" ON public.achievements;

CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert achievements" ON public.achievements
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

-- daily_statistics
DROP POLICY IF EXISTS "Anyone can view daily statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can manage statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can insert statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can update statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can delete statistics" ON public.daily_statistics;

CREATE POLICY "Anyone can view daily statistics" ON public.daily_statistics
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert statistics" ON public.daily_statistics
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can update statistics" ON public.daily_statistics
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can delete statistics" ON public.daily_statistics
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- quiz_questions
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can insert quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can update quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can delete quiz questions" ON public.quiz_questions;

CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert quiz questions" ON public.quiz_questions
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update quiz questions" ON public.quiz_questions
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete quiz questions" ON public.quiz_questions
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- media_files
DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can manage media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can insert media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can update media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can delete media files" ON public.media_files;

CREATE POLICY "Anyone can view media files" ON public.media_files
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert media files" ON public.media_files
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update media files" ON public.media_files
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete media files" ON public.media_files
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- category_views
DROP POLICY IF EXISTS "Anyone can view category views" ON public.category_views;
DROP POLICY IF EXISTS "Anyone can insert category views" ON public.category_views;

CREATE POLICY "Anyone can view category views" ON public.category_views
    FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can insert category views" ON public.category_views
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Anyone can update category views" ON public.category_views
    FOR UPDATE USING (TRUE);
