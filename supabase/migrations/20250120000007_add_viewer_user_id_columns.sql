-- Migration: Add viewer_user_id column to user_progress and fix RLS
-- Date: 2025-01-20
-- Description: Adds viewer_user_id column to support viewer users and fixes RLS policies

-- ============================================
-- PART 1: Add viewer_user_id column to user_progress
-- ============================================

-- Add viewer_user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'viewer_user_id'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make user_id nullable (since we now support viewer_user_id as alternative)
ALTER TABLE public.user_progress ALTER COLUMN user_id DROP NOT NULL;

-- Add unique constraint for viewer_user_id + presentation_id
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
CREATE INDEX IF NOT EXISTS idx_user_progress_viewer_user_id ON public.user_progress(viewer_user_id);

-- ============================================
-- PART 2: Add viewer_user_id to user_bookmarks if missing
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'viewer_user_id'
    ) THEN
        ALTER TABLE public.user_bookmarks 
        ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make user_id nullable for user_bookmarks
DO $$
BEGIN
    -- Check if user_id column exists and is not null
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

-- Add unique constraint for viewer_user_id + presentation_id on user_bookmarks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_bookmarks_viewer_user_presentation_unique'
    ) THEN
        ALTER TABLE public.user_bookmarks 
        ADD CONSTRAINT user_bookmarks_viewer_user_presentation_unique 
        UNIQUE (viewer_user_id, presentation_id);
    END IF;
END $$;

-- ============================================
-- PART 3: Fix user_progress RLS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Create new policies that support both user_id and viewer_user_id
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can delete own progress" ON public.user_progress
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 4: Fix user_bookmarks RLS policies
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
-- PART 5: Ensure RLS is enabled
-- ============================================

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
