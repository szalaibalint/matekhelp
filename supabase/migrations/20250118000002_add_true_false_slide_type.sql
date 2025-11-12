-- Add 'true_false' to the allowed slide types
ALTER TABLE public.slides DROP CONSTRAINT IF EXISTS slides_type_check;

ALTER TABLE public.slides ADD CONSTRAINT slides_type_check 
    CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'word_cloud', 'open_ended', 'rating', 'ranking', 'matching', 'true_false'));
