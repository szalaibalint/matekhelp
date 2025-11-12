-- Add background_color and text_color columns to slides table
ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS background_color text;
ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS text_color text;
