-- Enable RLS on tables if not already enabled
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;

-- Allow anonymous users to view published presentations
CREATE POLICY "Public read access to published presentations"
ON public.presentations
FOR SELECT
USING (status = 'published');

-- Allow anonymous users to view slides of published presentations
CREATE POLICY "Public read access to slides"
ON public.slides
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.presentations
    WHERE presentations.id = slides.presentation_id
    AND presentations.status = 'published'
  )
);

-- Allow anonymous users to view all categories
CREATE POLICY "Public read access to categories"
ON public.categories
FOR SELECT
USING (true);

-- Authenticated users can do everything (for the editor app)
DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;

CREATE POLICY "Authenticated users full access to presentations"
ON public.presentations
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to slides"
ON public.slides
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to categories"
ON public.categories
FOR ALL
USING (auth.role() = 'authenticated');
