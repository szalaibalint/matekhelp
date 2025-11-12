-- Add fill_in_blanks to the slide type enum
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_type_check;
ALTER TABLE slides ADD CONSTRAINT slides_type_check CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'ranking', 'matching', 'true_false', 'fill_in_blanks'));
