-- Add user_answers column to user_progress table to persist answers across sessions
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS user_answers jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_progress.user_answers IS 'Stores user answers for each slide to allow resume with previous answers';
