-- Make user_id nullable in user_progress table to support viewer users
ALTER TABLE public.user_progress 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or viewer_user_id is present
ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_user_check 
CHECK (user_id IS NOT NULL OR viewer_user_id IS NOT NULL);

-- Update unique constraint to handle both types of users
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_presentation_id_key;

-- Create unique index that handles both user types
CREATE UNIQUE INDEX user_progress_auth_user_presentation 
ON public.user_progress(user_id, presentation_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX user_progress_viewer_user_presentation 
ON public.user_progress(viewer_user_id, presentation_id) 
WHERE viewer_user_id IS NOT NULL;

-- Make user_id nullable in other related tables
ALTER TABLE public.presentation_sessions 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.search_history 
ALTER COLUMN user_id DROP NOT NULL;

-- presentation_ratings, user_bookmarks, presentation_comments already have nullable user_id from their creation

