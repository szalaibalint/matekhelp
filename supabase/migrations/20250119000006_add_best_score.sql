-- Add best_score column to user_progress table to track highest score achieved
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS best_score integer DEFAULT 0;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS best_score_percentage integer DEFAULT 0 CHECK (best_score_percentage >= 0 AND best_score_percentage <= 100);

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS total_points integer DEFAULT 0;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;

COMMENT ON COLUMN public.user_progress.best_score IS 'Highest score (points) achieved by user';
COMMENT ON COLUMN public.user_progress.best_score_percentage IS 'Highest score as percentage';
COMMENT ON COLUMN public.user_progress.total_points IS 'Total possible points in presentation';
COMMENT ON COLUMN public.user_progress.attempts IS 'Number of times user completed the presentation';
