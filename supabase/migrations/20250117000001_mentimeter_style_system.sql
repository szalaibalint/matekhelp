-- Drop old tables and recreate
DROP TABLE IF EXISTS public.blocks CASCADE;
DROP TABLE IF EXISTS public.slides CASCADE;
DROP TABLE IF EXISTS public.presentations CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Create presentations table
CREATE TABLE public.presentations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    theme jsonb DEFAULT '{"background": "#ffffff", "textColor": "#000000", "accentColor": "#4F46E5"}',
    settings jsonb DEFAULT '{"showProgress": true, "allowSkip": true, "showResults": true}',
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create slides table
CREATE TABLE public.slides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'word_cloud', 'open_ended', 'rating', 'ranking')),
    title text,
    content jsonb DEFAULT '{}',
    settings jsonb DEFAULT '{}',
    sort_order integer DEFAULT 0,
    points integer DEFAULT 0,
    correct_answer jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create indexes
CREATE INDEX idx_presentations_status ON public.presentations(status);
CREATE INDEX idx_presentations_created_by ON public.presentations(created_by);
CREATE INDEX idx_slides_presentation_id ON public.slides(presentation_id);
CREATE INDEX idx_slides_sort_order ON public.slides(sort_order);

-- Add updated_at triggers
CREATE TRIGGER presentations_updated_at BEFORE UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER slides_updated_at BEFORE UPDATE ON public.slides FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();