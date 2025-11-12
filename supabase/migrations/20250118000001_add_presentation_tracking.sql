-- Add view tracking columns to presentations table
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone;

-- Create index for sorting by popularity and recency
CREATE INDEX IF NOT EXISTS idx_presentations_view_count ON public.presentations(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_presentations_updated_at ON public.presentations(updated_at DESC);

-- Update RLS policies to allow incrementing view count
CREATE POLICY "Allow anonymous to increment view count" ON public.presentations
    FOR UPDATE
    USING (status = 'published')
    WITH CHECK (status = 'published');
