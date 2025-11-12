-- Drop old tables
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.slide_sets CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;

-- Create unified presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort_order integer DEFAULT 0,
    settings jsonb DEFAULT '{"theme": "default", "showProgress": true, "allowNavigation": true}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create blocks table (pages in presentation)
CREATE TABLE IF NOT EXISTS public.blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('document', 'slide', 'quiz', 'poll', 'word_cloud', 'ranking')),
    title text,
    content jsonb DEFAULT '{}',
    settings jsonb DEFAULT '{}',
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable realtime
alter publication supabase_realtime add table presentations;
alter publication supabase_realtime add table blocks;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_presentations_category_id ON public.presentations(category_id);
CREATE INDEX IF NOT EXISTS idx_presentations_status ON public.presentations(status);
CREATE INDEX IF NOT EXISTS idx_blocks_presentation_id ON public.blocks(presentation_id);
CREATE INDEX IF NOT EXISTS idx_blocks_sort_order ON public.blocks(sort_order);

-- Add updated_at triggers
CREATE TRIGGER presentations_updated_at BEFORE UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER blocks_updated_at BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
