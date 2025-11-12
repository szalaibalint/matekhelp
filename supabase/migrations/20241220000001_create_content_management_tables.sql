-- Content Management System Tables

-- Categories table for hierarchical organization
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Documents table for rich text content
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content jsonb DEFAULT '{}',
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Slide sets table for presentation content
CREATE TABLE IF NOT EXISTS public.slide_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Individual slides within slide sets
CREATE TABLE IF NOT EXISTS public.slides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slide_set_id uuid NOT NULL REFERENCES public.slide_sets(id) ON DELETE CASCADE,
    title text,
    content jsonb DEFAULT '{}',
    animation_config jsonb DEFAULT '{}',
    transition_config jsonb DEFAULT '{}',
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    scoring_config jsonb DEFAULT '{}',
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Quiz questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text text NOT NULL,
    question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'matching')),
    options jsonb DEFAULT '[]',
    correct_answer jsonb,
    points integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Media files table for uploaded content
CREATE TABLE IF NOT EXISTS public.media_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filename text NOT NULL,
    original_filename text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    alt_text text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable realtime for all tables
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table documents;
alter publication supabase_realtime add table slide_sets;
alter publication supabase_realtime add table slides;
alter publication supabase_realtime add table quizzes;
alter publication supabase_realtime add table quiz_questions;
alter publication supabase_realtime add table media_files;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON public.documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_slide_sets_category_id ON public.slide_sets(category_id);
CREATE INDEX IF NOT EXISTS idx_slides_slide_set_id ON public.slides(slide_set_id);
CREATE INDEX IF NOT EXISTS idx_slides_sort_order ON public.slides(sort_order);
CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON public.quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_sort_order ON public.quiz_questions(sort_order);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER slide_sets_updated_at BEFORE UPDATE ON public.slide_sets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER slides_updated_at BEFORE UPDATE ON public.slides FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();