-- Migration: Fix user_progress RLS policies
-- Date: 2025-01-20
-- Description: Allows both auth.users and viewer_users to save progress

-- First, add unique constraint for upsert to work (if not exists)
DO $$
BEGIN
    -- Add unique constraint for viewer_user_id + presentation_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_progress_viewer_user_presentation_unique'
    ) THEN
        -- Check if viewer_user_id column exists before creating constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_progress' 
            AND column_name = 'viewer_user_id'
        ) THEN
            EXECUTE 'ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_viewer_user_presentation_unique UNIQUE (viewer_user_id, presentation_id)';
        END IF;
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

-- Check if viewer_user_id column exists and create appropriate policies
DO $$
DECLARE
    has_viewer_user_id boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'viewer_user_id'
    ) INTO has_viewer_user_id;

    IF has_viewer_user_id THEN
        -- Policies that support both user_id and viewer_user_id
        EXECUTE '
            CREATE POLICY "Users can view own progress" ON public.user_progress
            FOR SELECT USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
        
        EXECUTE '
            CREATE POLICY "Users can create own progress" ON public.user_progress
            FOR INSERT WITH CHECK (
                (user_id = (select auth.uid()) OR user_id IS NULL)
                OR (viewer_user_id = (select auth.uid()) OR viewer_user_id IS NULL)
            )';
        
        EXECUTE '
            CREATE POLICY "Users can update own progress" ON public.user_progress
            FOR UPDATE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
    ELSE
        -- Policies that only use user_id
        EXECUTE '
            CREATE POLICY "Users can view own progress" ON public.user_progress
            FOR SELECT USING (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can create own progress" ON public.user_progress
            FOR INSERT WITH CHECK (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can update own progress" ON public.user_progress
            FOR UPDATE USING (user_id = (select auth.uid()))';
    END IF;
END $$;

-- Also fix user_bookmarks if it has similar issues
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;

DO $$
DECLARE
    has_viewer_user_id boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'viewer_user_id'
    ) INTO has_viewer_user_id;

    IF has_viewer_user_id THEN
        EXECUTE '
            CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
            FOR SELECT USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
        
        EXECUTE '
            CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
            FOR INSERT WITH CHECK (
                (user_id = (select auth.uid()) OR user_id IS NULL)
                OR (viewer_user_id = (select auth.uid()) OR viewer_user_id IS NULL)
            )';
        
        EXECUTE '
            CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
            FOR DELETE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
    ELSE
        EXECUTE '
            CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
            FOR SELECT USING (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
            FOR INSERT WITH CHECK (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
            FOR DELETE USING (user_id = (select auth.uid()))';
    END IF;
END $$;

-- Fix presentation_ratings too
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.presentation_ratings;

DO $$
DECLARE
    has_viewer_user_id boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'presentation_ratings' 
        AND column_name = 'viewer_user_id'
    ) INTO has_viewer_user_id;

    IF has_viewer_user_id THEN
        EXECUTE '
            CREATE POLICY "Users can create ratings" ON public.presentation_ratings
            FOR INSERT WITH CHECK (
                (user_id = (select auth.uid()) OR user_id IS NULL)
                OR (viewer_user_id = (select auth.uid()) OR viewer_user_id IS NULL)
            )';
        
        EXECUTE '
            CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
            FOR UPDATE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
        
        EXECUTE '
            CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
            FOR DELETE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
    ELSE
        EXECUTE '
            CREATE POLICY "Users can create ratings" ON public.presentation_ratings
            FOR INSERT WITH CHECK (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
            FOR UPDATE USING (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
            FOR DELETE USING (user_id = (select auth.uid()))';
    END IF;
END $$;
