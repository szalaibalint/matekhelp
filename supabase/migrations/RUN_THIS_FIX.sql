-- SIMPLE FIX: Run this ENTIRE script in Supabase SQL Editor
-- This will fix the user_progress RLS issue

-- Step 1: Add the missing column
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS viewer_user_id uuid;

-- Step 2: Make user_id nullable
ALTER TABLE public.user_progress 
ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Add unique constraint (drop first if exists to avoid error)
ALTER TABLE public.user_progress 
DROP CONSTRAINT IF EXISTS user_progress_viewer_user_presentation_unique;

ALTER TABLE public.user_progress 
ADD CONSTRAINT user_progress_viewer_user_presentation_unique 
UNIQUE (viewer_user_id, presentation_id);

-- Step 4: Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop ALL old policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Step 6: Create new policies that work
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

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_viewer_user_id 
ON public.user_progress(viewer_user_id);

-- DONE! Test with this query to verify the column exists:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_progress' AND table_schema = 'public'
ORDER BY ordinal_position;
