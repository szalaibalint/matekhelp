-- Migration: Complete fix for user_progress and related tables
-- Date: 2025-01-20
-- Description: Adds missing viewer_user_id columns and fixes all RLS policies
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR

-- ============================================
-- STEP 1: Add viewer_user_id column to user_progress
-- ============================================

-- Check if viewer_users table exists first
DO $$
BEGIN
    -- Add viewer_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'viewer_user_id'
    ) THEN
        -- Check if viewer_users table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'viewer_users'
        ) THEN
            ALTER TABLE public.user_progress 
            ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
        ELSE
            -- Add without foreign key if viewer_users doesn't exist
            ALTER TABLE public.user_progress ADD COLUMN viewer_user_id uuid;
        END IF;
    END IF;
END $$;

-- Make user_id nullable (so we can use viewer_user_id instead)
DO $$
BEGIN
    -- Check if user_id is NOT NULL constrained
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_progress ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- Add unique constraint for upsert operations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_progress_viewer_user_presentation_unique'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD CONSTRAINT user_progress_viewer_user_presentation_unique 
        UNIQUE (viewer_user_id, presentation_id);
    END IF;
END $$;

-- Create index for viewer_user_id
CREATE INDEX IF NOT EXISTS idx_user_progress_viewer_user_id 
ON public.user_progress(viewer_user_id);

-- ============================================
-- STEP 2: Add viewer_user_id to user_bookmarks
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'viewer_user_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'viewer_users'
        ) THEN
            ALTER TABLE public.user_bookmarks 
            ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
        ELSE
            ALTER TABLE public.user_bookmarks ADD COLUMN viewer_user_id uuid;
        END IF;
    END IF;
    
    -- Make user_id nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_bookmarks ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- ============================================
-- STEP 3: Ensure RLS is enabled on all tables
-- ============================================

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Fix user_progress RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- SELECT: Users can view their own progress
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- INSERT: Users can create their own progress
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
-- STEP 5: Fix user_bookmarks RLS policies
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
-- STEP 6: Fix presentations RLS policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can view presentations" ON public.presentations;
DROP POLICY IF EXISTS "Anyone can view published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can manage presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can insert presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can update presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can delete presentations" ON public.presentations;

-- Anyone can view published presentations, authenticated can view all
CREATE POLICY "Anyone can view presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert presentations" ON public.presentations
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update presentations" ON public.presentations
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete presentations" ON public.presentations
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- STEP 7: Fix slides RLS policies
-- ============================================

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

-- ============================================
-- STEP 8: Fix categories RLS policies
-- ============================================

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

-- ============================================
-- STEP 9: Fix viewer_users RLS policies
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'viewer_users') THEN
        ALTER TABLE public.viewer_users ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.viewer_users;
        
        EXECUTE 'CREATE POLICY "Users can view own profile" ON public.viewer_users FOR SELECT USING (id = (select auth.uid()))';
        EXECUTE 'CREATE POLICY "Users can update own profile" ON public.viewer_users FOR UPDATE USING (id = (select auth.uid()))';
        EXECUTE 'CREATE POLICY "Users can insert own profile" ON public.viewer_users FOR INSERT WITH CHECK (id = (select auth.uid()))';
    END IF;
END $$;

-- ============================================
-- STEP 10: Fix presentation_sessions RLS
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'presentation_sessions') THEN
        ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Users can view sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Users can update own sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;
        
        EXECUTE 'CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions FOR INSERT WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY "Users can view own sessions" ON public.presentation_sessions FOR SELECT USING (viewer_user_id = (select auth.uid()) OR user_id = (select auth.uid()) OR (user_id IS NULL AND viewer_user_id IS NULL))';
        EXECUTE 'CREATE POLICY "Users can update own sessions" ON public.presentation_sessions FOR UPDATE USING (viewer_user_id = (select auth.uid()) OR user_id = (select auth.uid()) OR (user_id IS NULL AND viewer_user_id IS NULL))';
    END IF;
END $$;

-- ============================================
-- DONE! Verify the changes
-- ============================================

-- You can verify the viewer_user_id column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_progress' AND table_schema = 'public';
