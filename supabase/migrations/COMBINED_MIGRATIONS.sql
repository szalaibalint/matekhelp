-- ================================================================================
-- COMBINED MIGRATION FILE
-- ================================================================================
-- This file combines all migration files in chronological order
-- Created: 2026-01-29
-- 
-- Files included (in order):
-- 1. 20241220000001_create_content_management_tables.sql
-- 2. 20250112000001_add_public_access_policies.sql
-- 3. 20250116000001_fix_content_tables.sql
-- 4. 20250116000002_add_missing_columns.sql
-- 5. 20250116000003_unified_presentation_system.sql
-- 6. 20250117000001_mentimeter_style_system.sql
-- 7. 20250117000002_add_categories_back.sql
-- 8. 20250117000003_add_slide_colors.sql
-- 9. 20250117000004_add_fill_in_blanks_slide_type.sql
-- 10. 20250118000001_add_matching_slide_type.sql
-- 11. 20250118000001_add_presentation_tracking.sql
-- 12. 20250118000002_add_true_false_slide_type.sql
-- 13. 20250118000002_create_increment_views_function.sql
-- 14. 20250118000003_add_comprehensive_analytics.sql
-- 15. 20250118000004_create_analytics_functions.sql
-- 16. 20250118000005_add_user_profiles.sql
-- 17. 20250118000006_add_user_functions.sql
-- 18. 20250119000000_complete_viewer_setup.sql
-- 19. 20250119000001_add_sort_order.sql
-- 20. 20250119000001_create_viewer_users.sql
-- 21. 20250119000002_add_category_images.sql
-- 22. 20250119000002_create_storage_bucket.sql
-- 23. 20250119000003_update_rls_for_viewer_users.sql
-- 24. 20250119000004_make_user_id_nullable.sql
-- 25. 20250119000005_add_user_answers_column.sql
-- 26. 20250119000006_add_best_score.sql
-- 27. 20250120000001_add_display_order_to_presentations.sql
-- 28. 20250120000001_add_user_progress_updated_at.sql
-- 29. 20250120000001_fix_security_issues.sql
-- 30. 20250120000002_fix_performance_issues.sql
-- 31. 20250120000003_fix_remaining_performance_issues.sql
-- 32. 20250120000004_fix_user_progress_rls.sql
-- 33. 20250120000005_add_user_progress_constraint.sql
-- 34. 20250120000006_comprehensive_rls_fix.sql
-- 35. 20250120000007_add_viewer_user_id_columns.sql
-- 36. 20250120000008_complete_fix.sql
-- ================================================================================


-- ================================================================================
-- MIGRATION: 20241220000001_create_content_management_tables.sql
-- ================================================================================

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


-- ================================================================================
-- MIGRATION: 20250112000001_add_public_access_policies.sql
-- ================================================================================

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



-- ================================================================================
-- MIGRATION: 20250116000001_fix_content_tables.sql
-- ================================================================================

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
    description text,
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
    content jsonb DEFAULT '{}',
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    content jsonb DEFAULT '{}',
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    scoring_config jsonb DEFAULT '{}',
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
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
alter publication supabase_realtime add table quizzes;
alter publication supabase_realtime add table media_files;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON public.documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_slide_sets_category_id ON public.slide_sets(category_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON public.quizzes(category_id);

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
CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();



-- ================================================================================
-- MIGRATION: 20250116000002_add_missing_columns.sql
-- ================================================================================

-- Add missing columns to existing tables

-- Add description column to documents if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.documents ADD COLUMN description text;
    END IF;
END $$;

-- Add content column to slide_sets if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'slide_sets' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.slide_sets ADD COLUMN content jsonb DEFAULT '{}';
    END IF;
END $$;

-- Add content column to quizzes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quizzes' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.quizzes ADD COLUMN content jsonb DEFAULT '{}';
    END IF;
END $$;



-- ================================================================================
-- MIGRATION: 20250116000003_unified_presentation_system.sql
-- ================================================================================

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



-- ================================================================================
-- MIGRATION: 20250117000001_mentimeter_style_system.sql
-- ================================================================================

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


-- ================================================================================
-- MIGRATION: 20250117000002_add_categories_back.sql
-- ================================================================================

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Add category_id to presentations
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Update slides table to support multiple correct answers and ranking
ALTER TABLE public.slides ALTER COLUMN correct_answer TYPE jsonb USING correct_answer::jsonb;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_presentations_category_id ON public.presentations(category_id);

-- Add updated_at trigger for categories
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();



-- ================================================================================
-- MIGRATION: 20250117000003_add_slide_colors.sql
-- ================================================================================

-- Add background_color and text_color columns to slides table
ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS background_color text;
ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS text_color text;



-- ================================================================================
-- MIGRATION: 20250117000004_add_fill_in_blanks_slide_type.sql
-- ================================================================================

-- Add fill_in_blanks to the slide type enum
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_type_check;
ALTER TABLE slides ADD CONSTRAINT slides_type_check CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'ranking', 'matching', 'true_false', 'fill_in_blanks'));



-- ================================================================================
-- MIGRATION: 20250118000001_add_matching_slide_type.sql
-- ================================================================================

-- Add 'matching' to the allowed slide types
ALTER TABLE public.slides DROP CONSTRAINT IF EXISTS slides_type_check;

ALTER TABLE public.slides ADD CONSTRAINT slides_type_check 
    CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'word_cloud', 'open_ended', 'rating', 'ranking', 'matching'));



-- ================================================================================
-- MIGRATION: 20250118000001_add_presentation_tracking.sql
-- ================================================================================

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



-- ================================================================================
-- MIGRATION: 20250118000002_add_true_false_slide_type.sql
-- ================================================================================

-- Add 'true_false' to the allowed slide types
ALTER TABLE public.slides DROP CONSTRAINT IF EXISTS slides_type_check;

ALTER TABLE public.slides ADD CONSTRAINT slides_type_check 
    CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'word_cloud', 'open_ended', 'rating', 'ranking', 'matching', 'true_false'));



-- ================================================================================
-- MIGRATION: 20250118000002_create_increment_views_function.sql
-- ================================================================================

-- Create function to increment presentation views atomically
CREATE OR REPLACE FUNCTION public.increment_presentation_views(presentation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.presentations
  SET 
    view_count = COALESCE(view_count, 0) + 1,
    last_viewed_at = NOW()
  WHERE id = presentation_id;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.increment_presentation_views(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_presentation_views(uuid) TO authenticated;



-- ================================================================================
-- MIGRATION: 20250118000003_add_comprehensive_analytics.sql
-- ================================================================================

-- Add comprehensive tracking fields to presentations table
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone;
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS completion_count integer DEFAULT 0;
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS average_score numeric(5,2);
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS total_time_spent integer DEFAULT 0; -- in seconds
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS estimated_duration integer; -- in minutes
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS author_name text;

-- Create presentation_sessions table for detailed analytics
CREATE TABLE IF NOT EXISTS public.presentation_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- null for anonymous
    started_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    completed_at timestamp with time zone,
    last_slide_index integer DEFAULT 0,
    total_time_spent integer DEFAULT 0, -- in seconds
    score numeric(5,2),
    answers jsonb DEFAULT '{}',
    is_completed boolean DEFAULT false,
    device_type text, -- 'mobile', 'tablet', 'desktop'
    browser text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create presentation_ratings table
CREATE TABLE IF NOT EXISTS public.presentation_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    review text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(presentation_id, user_id)
);

-- Create user_bookmarks table
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, presentation_id)
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS public.user_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    last_slide_index integer DEFAULT 0,
    progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, presentation_id)
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS public.search_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    search_query text NOT NULL,
    results_count integer DEFAULT 0,
    clicked_presentation_id uuid REFERENCES public.presentations(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create category_views table
CREATE TABLE IF NOT EXISTS public.category_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    view_count integer DEFAULT 1,
    last_viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create daily_statistics table for aggregated data
CREATE TABLE IF NOT EXISTS public.daily_statistics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL UNIQUE,
    total_views integer DEFAULT 0,
    unique_visitors integer DEFAULT 0,
    total_sessions integer DEFAULT 0,
    completed_sessions integer DEFAULT 0,
    average_session_duration integer DEFAULT 0,
    new_presentations integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_presentation_id ON public.presentation_sessions(presentation_id);
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_user_id ON public.presentation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_started_at ON public.presentation_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_completed ON public.presentation_sessions(is_completed) WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_presentation_ratings_presentation_id ON public.presentation_ratings(presentation_id);
CREATE INDEX IF NOT EXISTS idx_presentation_ratings_user_id ON public.presentation_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_presentation_ratings_rating ON public.presentation_ratings(rating DESC);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_presentation_id ON public.user_bookmarks(presentation_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_presentation_id ON public.user_progress(presentation_id);

CREATE INDEX IF NOT EXISTS idx_search_history_search_query ON public.search_history(search_query);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON public.search_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_category_views_category_id ON public.category_views(category_id);

CREATE INDEX IF NOT EXISTS idx_presentations_tags ON public.presentations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_presentations_difficulty ON public.presentations(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_presentations_featured ON public.presentations(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_presentations_completion_count ON public.presentations(completion_count DESC);
CREATE INDEX IF NOT EXISTS idx_presentations_average_score ON public.presentations(average_score DESC);

-- Add updated_at trigger for ratings
CREATE TRIGGER presentation_ratings_updated_at 
    BEFORE UPDATE ON public.presentation_ratings 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on new tables
ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for presentation_sessions
CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view own sessions" ON public.presentation_sessions
    FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own sessions" ON public.presentation_sessions
    FOR UPDATE
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all sessions" ON public.presentation_sessions
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- RLS Policies for presentation_ratings
CREATE POLICY "Anyone can view ratings" ON public.presentation_ratings
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create ratings" ON public.presentation_ratings
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
    FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for user_bookmarks
CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
    FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for user_progress
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE
    USING (user_id = auth.uid());

-- RLS Policies for search_history
CREATE POLICY "Users can view own search history" ON public.search_history
    FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can create search history" ON public.search_history
    FOR INSERT
    WITH CHECK (true);

-- RLS Policies for category_views
CREATE POLICY "Anyone can view category stats" ON public.category_views
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create category views" ON public.category_views
    FOR INSERT
    WITH CHECK (true);

-- RLS Policies for daily_statistics
CREATE POLICY "Anyone can view daily statistics" ON public.daily_statistics
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage statistics" ON public.daily_statistics
    FOR ALL
    USING (auth.role() = 'authenticated');



-- ================================================================================
-- MIGRATION: 20250118000004_create_analytics_functions.sql
-- ================================================================================

-- Function to update presentation statistics after session completion
CREATE OR REPLACE FUNCTION public.update_presentation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only update if session is being marked as completed
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
        UPDATE public.presentations
        SET 
            completion_count = completion_count + 1,
            total_time_spent = total_time_spent + NEW.total_time_spent,
            average_score = (
                SELECT AVG(score)
                FROM public.presentation_sessions
                WHERE presentation_id = NEW.presentation_id 
                AND is_completed = true
                AND score IS NOT NULL
            )
        WHERE id = NEW.presentation_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for updating presentation stats
DROP TRIGGER IF EXISTS trigger_update_presentation_stats ON public.presentation_sessions;
CREATE TRIGGER trigger_update_presentation_stats
    AFTER INSERT OR UPDATE ON public.presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_presentation_stats();

-- Function to get trending presentations (high views in last 7 days)
CREATE OR REPLACE FUNCTION public.get_trending_presentations(days_back integer DEFAULT 7, result_limit integer DEFAULT 10)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    view_count integer,
    completion_count integer,
    average_score numeric,
    recent_views bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.description,
        p.view_count,
        p.completion_count,
        p.average_score,
        COUNT(ps.id)::bigint as recent_views
    FROM public.presentations p
    LEFT JOIN public.presentation_sessions ps 
        ON p.id = ps.presentation_id 
        AND ps.started_at >= NOW() - (days_back || ' days')::interval
    WHERE p.status = 'published'
    GROUP BY p.id
    ORDER BY recent_views DESC, p.view_count DESC
    LIMIT result_limit;
END;
$$;

-- Function to get recommended presentations based on user history
CREATE OR REPLACE FUNCTION public.get_recommended_presentations(p_user_id uuid, result_limit integer DEFAULT 10)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    category_id uuid,
    average_score numeric,
    view_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id,
        p.title,
        p.description,
        p.category_id,
        p.average_score,
        p.view_count
    FROM public.presentations p
    WHERE p.status = 'published'
    AND p.category_id IN (
        -- Get categories from user's viewing history
        SELECT DISTINCT p2.category_id
        FROM public.presentation_sessions ps
        JOIN public.presentations p2 ON ps.presentation_id = p2.id
        WHERE ps.user_id = p_user_id
        AND p2.category_id IS NOT NULL
    )
    AND p.id NOT IN (
        -- Exclude already viewed presentations
        SELECT presentation_id
        FROM public.presentation_sessions
        WHERE user_id = p_user_id
    )
    ORDER BY p.average_score DESC NULLS LAST, p.view_count DESC
    LIMIT result_limit;
END;
$$;

-- Function to track search queries
CREATE OR REPLACE FUNCTION public.track_search(
    p_user_id uuid,
    p_search_query text,
    p_results_count integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    search_id uuid;
BEGIN
    INSERT INTO public.search_history (user_id, search_query, results_count)
    VALUES (p_user_id, p_search_query, p_results_count)
    RETURNING id INTO search_id;
    
    RETURN search_id;
END;
$$;

-- Function to update search with clicked result
CREATE OR REPLACE FUNCTION public.track_search_click(
    p_search_id uuid,
    p_presentation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.search_history
    SET clicked_presentation_id = p_presentation_id
    WHERE id = p_search_id;
END;
$$;

-- Function to get popular searches
CREATE OR REPLACE FUNCTION public.get_popular_searches(result_limit integer DEFAULT 10)
RETURNS TABLE (
    search_query text,
    search_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.search_query,
        COUNT(*)::bigint as search_count
    FROM public.search_history sh
    WHERE sh.created_at >= NOW() - interval '30 days'
    GROUP BY sh.search_query
    ORDER BY search_count DESC
    LIMIT result_limit;
END;
$$;

-- Function to update or create user progress
CREATE OR REPLACE FUNCTION public.update_user_progress(
    p_user_id uuid,
    p_presentation_id uuid,
    p_last_slide_index integer,
    p_progress_percentage integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_progress (user_id, presentation_id, last_slide_index, progress_percentage, last_accessed_at)
    VALUES (p_user_id, p_presentation_id, p_last_slide_index, p_progress_percentage, NOW())
    ON CONFLICT (user_id, presentation_id)
    DO UPDATE SET
        last_slide_index = p_last_slide_index,
        progress_percentage = p_progress_percentage,
        last_accessed_at = NOW();
END;
$$;

-- Function to aggregate daily statistics
CREATE OR REPLACE FUNCTION public.aggregate_daily_statistics(p_date date DEFAULT CURRENT_DATE - interval '1 day')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.daily_statistics (
        date,
        total_views,
        unique_visitors,
        total_sessions,
        completed_sessions,
        average_session_duration,
        new_presentations
    )
    SELECT
        p_date,
        COUNT(DISTINCT ps.id),
        COUNT(DISTINCT COALESCE(ps.user_id::text, ps.ip_address::text)),
        COUNT(ps.id),
        COUNT(ps.id) FILTER (WHERE ps.is_completed = true),
        AVG(ps.total_time_spent)::integer,
        (SELECT COUNT(*) FROM public.presentations 
         WHERE DATE(created_at) = p_date)
    FROM public.presentation_sessions ps
    WHERE DATE(ps.started_at) = p_date
    ON CONFLICT (date) 
    DO UPDATE SET
        total_views = EXCLUDED.total_views,
        unique_visitors = EXCLUDED.unique_visitors,
        total_sessions = EXCLUDED.total_sessions,
        completed_sessions = EXCLUDED.completed_sessions,
        average_session_duration = EXCLUDED.average_session_duration,
        new_presentations = EXCLUDED.new_presentations;
END;
$$;

-- Function to increment category views
CREATE OR REPLACE FUNCTION public.increment_category_views(p_category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.category_views (category_id, view_count, last_viewed_at)
    VALUES (p_category_id, 1, NOW())
    ON CONFLICT (category_id)
    DO UPDATE SET
        view_count = category_views.view_count + 1,
        last_viewed_at = NOW();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_trending_presentations(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_trending_presentations(integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_recommended_presentations(uuid, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.track_search(uuid, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.track_search(uuid, text, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.track_search_click(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.track_search_click(uuid, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_popular_searches(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_popular_searches(integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_user_progress(uuid, uuid, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.aggregate_daily_statistics(date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.increment_category_views(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_category_views(uuid) TO authenticated;



-- ================================================================================
-- MIGRATION: 20250118000005_add_user_profiles.sql
-- ================================================================================

-- [Content continues in next message due to length limit...]
