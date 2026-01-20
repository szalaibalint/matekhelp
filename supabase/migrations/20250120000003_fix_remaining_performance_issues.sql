-- Migration: Fix Remaining Performance Issues
-- Date: 2025-01-20
-- Description: Fixes remaining duplicate policies and auth function re-evaluation

-- ============================================
-- PART 1: Fix users table policy
-- ============================================

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        EXECUTE 'CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (id = (select auth.uid()))';
    END IF;
END $$;

-- ============================================
-- PART 2: Fix presentations duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
DROP POLICY IF EXISTS "Anyone can view presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can manage presentations" ON public.presentations;

-- Single SELECT policy (anyone can view published, authenticated can view all)
CREATE POLICY "Anyone can view presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);
-- Authenticated users can INSERT
CREATE POLICY "Authenticated users can insert presentations" ON public.presentations
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
-- Authenticated users can UPDATE
CREATE POLICY "Authenticated users can update presentations" ON public.presentations
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
-- Authenticated users can DELETE
CREATE POLICY "Authenticated users can delete presentations" ON public.presentations
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 3: Fix slides duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Anyone can view slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can manage slides" ON public.slides;

-- Single SELECT policy
CREATE POLICY "Anyone can view slides" ON public.slides
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert slides" ON public.slides
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update slides" ON public.slides
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete slides" ON public.slides
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 4: Fix categories duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;

-- Single SELECT policy
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert categories" ON public.categories
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update categories" ON public.categories
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete categories" ON public.categories
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 5: Fix presentation_sessions duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can view sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;

-- Single SELECT policy combining user and admin access
CREATE POLICY "Users can view sessions" ON public.presentation_sessions
    FOR SELECT USING (
        user_id = (select auth.uid()) 
        OR user_id IS NULL 
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- Single INSERT policy
CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions
    FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- PART 6: Fix achievements duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can update achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can delete achievements" ON public.achievements;

-- Single SELECT policy
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (TRUE);
-- Admin-only write policies
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

-- ============================================
-- PART 7: Fix daily_statistics duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Admins can manage statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Anyone can view daily statistics" ON public.daily_statistics;

-- Single SELECT policy
CREATE POLICY "Anyone can view daily statistics" ON public.daily_statistics
    FOR SELECT USING (TRUE);
-- Admin-only write policies
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

-- ============================================
-- PART 8: Fix quiz_questions duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can insert quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can update quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can delete quiz questions" ON public.quiz_questions;

-- Single SELECT policy
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert quiz questions" ON public.quiz_questions
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update quiz questions" ON public.quiz_questions
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete quiz questions" ON public.quiz_questions
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 9: Fix media_files duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can manage media files" ON public.media_files;
DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can insert media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can update media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can delete media files" ON public.media_files;

-- Single SELECT policy
CREATE POLICY "Anyone can view media files" ON public.media_files
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert media files" ON public.media_files
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update media files" ON public.media_files
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete media files" ON public.media_files
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);
