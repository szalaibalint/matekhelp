-- Quick fix: Add unique constraint for user_progress upsert
-- Run this in Supabase SQL Editor

-- Add unique constraint for viewer_user_id + presentation_id
ALTER TABLE public.user_progress 
ADD CONSTRAINT user_progress_viewer_user_presentation_unique 
UNIQUE (viewer_user_id, presentation_id);
