-- ============================================
-- COMPLETE MIGRATION FILE
-- Generated: 2025-01-29
-- 
-- This file contains ALL migrations in chronological order.
-- Run this file in Supabase SQL Editor to set up the complete database schema.
-- 
-- IMPORTANT: This is a complete rebuild. Only run on a fresh database
-- or when you need to recreate all tables from scratch.
-- ============================================
-- ============================================
-- Migration: 20241220000001_create_content_management_tables.sql
-- ============================================

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
DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS slide_sets_updated_at ON public.slide_sets;
CREATE TRIGGER slide_sets_updated_at BEFORE UPDATE ON public.slide_sets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS slides_updated_at ON public.slides;
CREATE TRIGGER slides_updated_at BEFORE UPDATE ON public.slides FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS quizzes_updated_at ON public.quizzes;
CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS quiz_questions_updated_at ON public.quiz_questions;
CREATE TRIGGER quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Migration: 20250112000001_add_public_access_policies.sql
-- ============================================

-- NOTE: This migration is commented out because it references the presentations table
-- which doesn't exist yet. RLS policies will be set up later after presentations is created.

-- SKIPPED - Will be applied later after presentations table is created


-- ============================================
-- Migration: 20250116000001_fix_content_tables.sql
-- ============================================

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

-- Enable realtime for all tables (skipped - duplicates from first migration)
-- alter publication supabase_realtime add table categories;
-- alter publication supabase_realtime add table documents;
-- alter publication supabase_realtime add table slide_sets;
-- alter publication supabase_realtime add table quizzes;
-- alter publication supabase_realtime add table media_files;

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

-- Add updated_at triggers (skipped - duplicates from first migration)
-- CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- CREATE TRIGGER slide_sets_updated_at BEFORE UPDATE ON public.slide_sets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- Migration: 20250116000002_add_missing_columns.sql
-- ============================================

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


-- ============================================
-- Migration: 20250116000003_unified_presentation_system.sql
-- ============================================

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
DROP TRIGGER IF EXISTS presentations_updated_at ON public.presentations;
CREATE TRIGGER presentations_updated_at BEFORE UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS blocks_updated_at ON public.blocks;
CREATE TRIGGER blocks_updated_at BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- Migration: 20250117000001_mentimeter_style_system.sql
-- ============================================

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

-- Create indexes (skipped - will use IF NOT EXISTS versions)
-- CREATE INDEX idx_presentations_status ON public.presentations(status);
-- CREATE INDEX idx_presentations_created_by ON public.presentations(created_by);
-- CREATE INDEX idx_slides_presentation_id ON public.slides(presentation_id);
-- CREATE INDEX idx_slides_sort_order ON public.slides(sort_order);

-- Add updated_at triggers (skipped - duplicates)
-- CREATE TRIGGER presentations_updated_at BEFORE UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS slides_updated_at ON public.slides;
CREATE TRIGGER slides_updated_at BEFORE UPDATE ON public.slides FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security on presentations and slides
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Migration: 20250117000002_add_categories_back.sql
-- ============================================

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

-- Enable Row Level Security on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Add category_id to presentations
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Update slides table to support multiple correct answers and ranking
ALTER TABLE public.slides ALTER COLUMN correct_answer TYPE jsonb USING correct_answer::jsonb;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_presentations_category_id ON public.presentations(category_id);

-- Add updated_at trigger for categories (skipped - duplicate)
-- CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- Migration: 20250117000003_add_slide_colors.sql
-- ============================================

-- Add background_color and text_color columns to slides table
ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS background_color text;
ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS text_color text;


-- ============================================
-- Migration: 20250117000004_add_fill_in_blanks_slide_type.sql
-- ============================================

-- Add fill_in_blanks to the slide type enum
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_type_check;
ALTER TABLE slides ADD CONSTRAINT slides_type_check CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'ranking', 'matching', 'true_false', 'fill_in_blanks'));


-- ============================================
-- Migration: 20250118000001_add_matching_slide_type.sql
-- ============================================

-- Add 'matching' to the allowed slide types
ALTER TABLE public.slides DROP CONSTRAINT IF EXISTS slides_type_check;

ALTER TABLE public.slides ADD CONSTRAINT slides_type_check 
    CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'word_cloud', 'open_ended', 'rating', 'ranking', 'matching'));


-- ============================================
-- Migration: 20250118000001_add_presentation_tracking.sql
-- ============================================

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


-- ============================================
-- Migration: 20250118000002_add_true_false_slide_type.sql
-- ============================================

-- Add 'true_false' to the allowed slide types
ALTER TABLE public.slides DROP CONSTRAINT IF EXISTS slides_type_check;

ALTER TABLE public.slides ADD CONSTRAINT slides_type_check 
    CHECK (type IN ('text', 'heading', 'image', 'multiple_choice', 'word_cloud', 'open_ended', 'rating', 'ranking', 'matching', 'true_false'));


-- ============================================
-- Migration: 20250118000002_create_increment_views_function.sql
-- ============================================

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


-- ============================================
-- Migration: 20250118000003_add_comprehensive_analytics.sql
-- ============================================

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


-- ============================================
-- Migration: 20250118000004_create_analytics_functions.sql
-- ============================================

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


-- ============================================
-- Migration: 20250118000005_add_user_profiles.sql
-- ============================================

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    full_name text,
    avatar_url text,
    bio text,
    role text DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    preferences jsonb DEFAULT '{}',
    total_presentations_completed integer DEFAULT 0,
    total_time_spent integer DEFAULT 0, -- in seconds
    average_score numeric(5,2),
    streak_days integer DEFAULT 0,
    last_activity_date date,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    icon text,
    requirement_type text NOT NULL, -- 'presentations_completed', 'streak_days', 'perfect_score', etc.
    requirement_value integer NOT NULL,
    points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create user_achievements junction table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    earned_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, achievement_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text CHECK (type IN ('achievement', 'reminder', 'announcement', 'system')),
    is_read boolean DEFAULT false,
    action_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create user_learning_paths table
CREATE TABLE IF NOT EXISTS public.user_learning_paths (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    presentation_ids uuid[],
    current_position integer DEFAULT 0,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create comments table for presentations
CREATE TABLE IF NOT EXISTS public.presentation_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id uuid REFERENCES public.presentation_comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_edited boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_user_learning_paths_user_id ON public.user_learning_paths(user_id);

CREATE INDEX IF NOT EXISTS idx_presentation_comments_presentation_id ON public.presentation_comments(presentation_id);
CREATE INDEX IF NOT EXISTS idx_presentation_comments_user_id ON public.presentation_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_presentation_comments_parent_id ON public.presentation_comments(parent_comment_id);

-- Add triggers
CREATE TRIGGER user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_learning_paths_updated_at 
    BEFORE UPDATE ON public.user_learning_paths 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER presentation_comments_updated_at 
    BEFORE UPDATE ON public.presentation_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for achievements
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage achievements" ON public.achievements
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create achievements" ON public.user_achievements
    FOR INSERT
    WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- RLS Policies for user_learning_paths
CREATE POLICY "Users can view own learning paths" ON public.user_learning_paths
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own learning paths" ON public.user_learning_paths
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own learning paths" ON public.user_learning_paths
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own learning paths" ON public.user_learning_paths
    FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for presentation_comments
CREATE POLICY "Anyone can view comments" ON public.presentation_comments
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.presentation_comments
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON public.presentation_comments
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.presentation_comments
    FOR DELETE
    USING (user_id = auth.uid());

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, points) VALUES
    ('Első lépések', 'Teljesítsd az első tananyagodat!', '🎯', 'presentations_completed', 1, 10),
    ('Lelkes tanuló', 'Teljesíts 5 tananyagot!', '📚', 'presentations_completed', 5, 25),
    ('Mester', 'Teljesíts 25 tananyagot!', '🎓', 'presentations_completed', 25, 100),
    ('Tökéletes', 'Érj el 100%-os eredményt egy tananyagban!', '⭐', 'perfect_score', 1, 50),
    ('Kitartó', 'Tanulj 7 egymást követő napon!', '🔥', 'streak_days', 7, 75),
    ('Elkötelezett', 'Tanulj 30 egymást követő napon!', '💪', 'streak_days', 30, 200)
ON CONFLICT DO NOTHING;


-- ============================================
-- Migration: 20250118000006_add_user_functions.sql
-- ============================================

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update user statistics after session completion
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only update if session is completed and user is authenticated
    IF NEW.is_completed = true 
       AND (OLD.is_completed = false OR OLD.is_completed IS NULL)
       AND NEW.user_id IS NOT NULL THEN
        
        UPDATE public.user_profiles
        SET 
            total_presentations_completed = total_presentations_completed + 1,
            total_time_spent = total_time_spent + NEW.total_time_spent,
            average_score = (
                SELECT AVG(score)
                FROM public.presentation_sessions
                WHERE user_id = NEW.user_id 
                AND is_completed = true
                AND score IS NOT NULL
            ),
            last_activity_date = CURRENT_DATE
        WHERE id = NEW.user_id;
        
        -- Check and award achievements
        PERFORM public.check_and_award_achievements(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for updating user stats
DROP TRIGGER IF EXISTS trigger_update_user_stats ON public.presentation_sessions;
CREATE TRIGGER trigger_update_user_stats
    AFTER INSERT OR UPDATE ON public.presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats();

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    achievement_record RECORD;
    user_stat integer;
BEGIN
    FOR achievement_record IN 
        SELECT * FROM public.achievements
        WHERE id NOT IN (
            SELECT achievement_id 
            FROM public.user_achievements 
            WHERE user_id = p_user_id
        )
    LOOP
        -- Get relevant user statistic based on achievement type
        CASE achievement_record.requirement_type
            WHEN 'presentations_completed' THEN
                SELECT total_presentations_completed INTO user_stat
                FROM public.user_profiles
                WHERE id = p_user_id;
            
            WHEN 'streak_days' THEN
                SELECT streak_days INTO user_stat
                FROM public.user_profiles
                WHERE id = p_user_id;
            
            WHEN 'perfect_score' THEN
                SELECT COUNT(*)::integer INTO user_stat
                FROM public.presentation_sessions
                WHERE user_id = p_user_id 
                AND score = 100;
            
            ELSE
                user_stat := 0;
        END CASE;
        
        -- Award achievement if requirement met
        IF user_stat >= achievement_record.requirement_value THEN
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (p_user_id, achievement_record.id)
            ON CONFLICT DO NOTHING;
            
            -- Create notification
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                p_user_id,
                'Új teljesítmény!',
                'Megszerezted: ' || achievement_record.name,
                'achievement'
            );
        END IF;
    END LOOP;
END;
$$;

-- Function to update user streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_activity date;
    current_streak integer;
BEGIN
    SELECT last_activity_date, streak_days 
    INTO last_activity, current_streak
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    IF last_activity IS NULL THEN
        -- First activity
        UPDATE public.user_profiles
        SET streak_days = 1, last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
    ELSIF last_activity = CURRENT_DATE THEN
        -- Already counted today, do nothing
        RETURN;
    ELSIF last_activity = CURRENT_DATE - interval '1 day' THEN
        -- Consecutive day, increment streak
        UPDATE public.user_profiles
        SET 
            streak_days = streak_days + 1,
            last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
    ELSE
        -- Streak broken, reset to 1
        UPDATE public.user_profiles
        SET 
            streak_days = 1,
            last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
    END IF;
    
    -- Check for streak achievements
    PERFORM public.check_and_award_achievements(p_user_id);
END;
$$;

-- Function to get user leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(
    time_period text DEFAULT 'all_time', -- 'all_time', 'monthly', 'weekly'
    result_limit integer DEFAULT 50
)
RETURNS TABLE (
    user_id uuid,
    username text,
    full_name text,
    avatar_url text,
    total_score integer,
    presentations_completed integer,
    average_score numeric,
    rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    date_filter timestamp with time zone;
BEGIN
    -- Set date filter based on time period
    CASE time_period
        WHEN 'weekly' THEN
            date_filter := NOW() - interval '7 days';
        WHEN 'monthly' THEN
            date_filter := NOW() - interval '30 days';
        ELSE
            date_filter := '1970-01-01'::timestamp with time zone;
    END CASE;
    
    RETURN QUERY
    SELECT 
        up.id as user_id,
        up.username,
        up.full_name,
        up.avatar_url,
        (COALESCE(SUM(ps.score), 0))::integer as total_score,
        COUNT(ps.id)::integer as presentations_completed,
        AVG(ps.score) as average_score,
        ROW_NUMBER() OVER (ORDER BY SUM(ps.score) DESC, COUNT(ps.id) DESC) as rank
    FROM public.user_profiles up
    LEFT JOIN public.presentation_sessions ps 
        ON up.id = ps.user_id 
        AND ps.is_completed = true
        AND ps.completed_at >= date_filter
    GROUP BY up.id
    HAVING COUNT(ps.id) > 0
    ORDER BY total_score DESC, presentations_completed DESC
    LIMIT result_limit;
END;
$$;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_statistics(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'profile', (
            SELECT row_to_json(up.*)
            FROM public.user_profiles up
            WHERE up.id = p_user_id
        ),
        'achievements_count', (
            SELECT COUNT(*)
            FROM public.user_achievements
            WHERE user_id = p_user_id
        ),
        'bookmarks_count', (
            SELECT COUNT(*)
            FROM public.user_bookmarks
            WHERE user_id = p_user_id
        ),
        'recent_sessions', (
            SELECT json_agg(row_to_json(s.*))
            FROM (
                SELECT ps.*, p.title as presentation_title
                FROM public.presentation_sessions ps
                JOIN public.presentations p ON ps.presentation_id = p.id
                WHERE ps.user_id = p_user_id
                ORDER BY ps.started_at DESC
                LIMIT 10
            ) s
        ),
        'category_breakdown', (
            SELECT json_object_agg(c.name, stats.count)
            FROM (
                SELECT p.category_id, COUNT(*) as count
                FROM public.presentation_sessions ps
                JOIN public.presentations p ON ps.presentation_id = p.id
                WHERE ps.user_id = p_user_id AND ps.is_completed = true
                GROUP BY p.category_id
            ) stats
            JOIN public.categories c ON stats.category_id = c.id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = p_user_id
    AND user_id = auth.uid()
    AND is_read = false;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_and_award_achievements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_statistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) TO authenticated;


-- ============================================
-- Migration: 20250119000000_complete_viewer_setup.sql
-- ============================================

-- Complete Viewer User Authentication and Progress Tracking Setup
-- This migration creates the viewer_users table, updates RLS policies, and configures all necessary permissions

-- =====================================================
-- PART 1: Create viewer_users table
-- =====================================================

-- Create viewer_users table (separate from admin auth.users)
CREATE TABLE IF NOT EXISTS public.viewer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_viewer_users_email ON public.viewer_users(email);
CREATE INDEX IF NOT EXISTS idx_viewer_users_username ON public.viewer_users(username);

-- Enable RLS
ALTER TABLE public.viewer_users ENABLE ROW LEVEL SECURITY;

-- Policies for viewer_users
DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
CREATE POLICY "Users can view own profile"
  ON public.viewer_users
  FOR SELECT
  USING (auth.uid()::text = id::text OR true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
CREATE POLICY "Users can update own profile"
  ON public.viewer_users
  FOR UPDATE
  USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Anyone can register" ON public.viewer_users;
CREATE POLICY "Anyone can register"
  ON public.viewer_users
  FOR INSERT
  WITH CHECK (true);

-- Update user_profiles to link with viewer_users
-- Drop the foreign key constraint if it exists
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add the viewer_user_id column
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_viewer_user_id ON public.user_profiles(viewer_user_id);

-- Update other tables to optionally link with viewer_users
ALTER TABLE public.presentation_sessions ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.presentation_ratings ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.user_bookmarks ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.search_history ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);
ALTER TABLE public.presentation_comments ADD COLUMN IF NOT EXISTS viewer_user_id UUID REFERENCES public.viewer_users(id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_viewer_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS viewer_users_updated_at ON public.viewer_users;
CREATE TRIGGER viewer_users_updated_at
  BEFORE UPDATE ON public.viewer_users
  FOR EACH ROW
  EXECUTE FUNCTION update_viewer_user_updated_at();

-- Function to create user profile when viewer user registers
CREATE OR REPLACE FUNCTION create_viewer_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, viewer_user_id, username, full_name, avatar_url)
  VALUES (NEW.id, NEW.id, NEW.username, NEW.full_name, NEW.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_viewer_user_created ON public.viewer_users;
CREATE TRIGGER on_viewer_user_created
  AFTER INSERT ON public.viewer_users
  FOR EACH ROW
  EXECUTE FUNCTION create_viewer_user_profile();

-- =====================================================
-- PART 2: Create storage bucket for images
-- =====================================================

-- Create storage bucket for presentation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentation-images', 'presentation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'presentation-images');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own images
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete images
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- =====================================================
-- PART 3: Update RLS policies for viewer users
-- =====================================================

-- user_progress policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

CREATE POLICY "Users can create own progress" ON public.user_progress
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_sessions policies
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
CREATE POLICY "Users can create sessions" ON public.presentation_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_ratings policies
DROP POLICY IF EXISTS "Users can rate presentations" ON public.presentation_ratings;
CREATE POLICY "Users can rate presentations" ON public.presentation_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view own ratings" ON public.presentation_ratings;
CREATE POLICY "Users can view own ratings" ON public.presentation_ratings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- user_bookmarks policies
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.user_bookmarks
  FOR ALL
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- search_history policies
DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
CREATE POLICY "Users can create search history" ON public.search_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_comments policies
DROP POLICY IF EXISTS "Users can create comments" ON public.presentation_comments;
CREATE POLICY "Users can create comments" ON public.presentation_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can update own comments" ON public.presentation_comments;
CREATE POLICY "Users can update own comments" ON public.presentation_comments
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- =====================================================
-- PART 4: Make user_id columns nullable
-- =====================================================

-- Make user_id nullable in user_progress table to support viewer users
ALTER TABLE public.user_progress 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or viewer_user_id is present
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_check;

ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_user_check 
CHECK (user_id IS NOT NULL OR viewer_user_id IS NOT NULL);

-- Update unique constraint to handle both types of users
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_presentation_id_key;

-- Create unique index that handles both user types
DROP INDEX IF EXISTS user_progress_auth_user_presentation;
CREATE UNIQUE INDEX user_progress_auth_user_presentation 
ON public.user_progress(user_id, presentation_id) 
WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS user_progress_viewer_user_presentation;
CREATE UNIQUE INDEX user_progress_viewer_user_presentation 
ON public.user_progress(viewer_user_id, presentation_id) 
WHERE viewer_user_id IS NOT NULL;

-- Make user_id nullable in other related tables
ALTER TABLE public.presentation_sessions 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.search_history 
ALTER COLUMN user_id DROP NOT NULL;

-- presentation_ratings, user_bookmarks, presentation_comments user_id is already nullable

COMMENT ON TABLE public.viewer_users IS 'Separate authentication table for public viewer users (not admin users)';
COMMENT ON COLUMN public.user_progress.viewer_user_id IS 'Links progress to viewer users instead of auth.users';


-- ============================================
-- Migration: 20250119000001_add_sort_order.sql
-- ============================================

-- Add sort_order column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set initial sort_order based on creation time
WITH numbered_categories AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at) - 1 AS row_num
  FROM categories
)
UPDATE categories
SET sort_order = numbered_categories.row_num
FROM numbered_categories
WHERE categories.id = numbered_categories.id;

-- Create index for better query performance (note: composite index, different from simple sort_order index)
DROP INDEX IF EXISTS idx_categories_sort_order;
CREATE INDEX idx_categories_sort_order ON categories(parent_id, sort_order);


-- ============================================
-- Migration: 20250119000001_create_viewer_users.sql (DUPLICATE - SKIPPED)
-- ============================================
-- NOTE: This migration is a duplicate. The viewer_users table and related
-- setup was already created earlier in the file. Skipping to avoid conflicts.

-- ============================================
-- Migration: 20250119000002_add_category_images.sql
-- ============================================

-- Add image_url column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;


-- ============================================
-- Migration: 20250119000002_create_storage_bucket.sql
-- ============================================

-- Create storage bucket for presentation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentation-images', 'presentation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images (skipped - duplicate)
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- CREATE POLICY "Public Access"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'presentation-images');

-- Allow authenticated users to upload images (skipped - duplicate)
-- CREATE POLICY "Authenticated users can upload images"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own images (skipped - duplicate)
-- CREATE POLICY "Authenticated users can update images"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete images (skipped - duplicate)
-- CREATE POLICY "Authenticated users can delete images"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'presentation-images' AND auth.role() = 'authenticated');


-- ============================================
-- Migration: 20250119000003_update_rls_for_viewer_users.sql
-- ============================================

-- Update RLS policies for user_progress to allow viewer users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

-- Create new policies that support both auth users and viewer users
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

CREATE POLICY "Users can create own progress" ON public.user_progress
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- Similar updates for other tables that viewer users interact with

-- presentation_sessions
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
CREATE POLICY "Users can create sessions" ON public.presentation_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_ratings
DROP POLICY IF EXISTS "Users can rate presentations" ON public.presentation_ratings;
CREATE POLICY "Users can rate presentations" ON public.presentation_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view own ratings" ON public.presentation_ratings;
CREATE POLICY "Users can view own ratings" ON public.presentation_ratings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- user_bookmarks
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.user_bookmarks
  FOR ALL
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- search_history
DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
CREATE POLICY "Users can create search history" ON public.search_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

-- presentation_comments
DROP POLICY IF EXISTS "Users can create comments" ON public.presentation_comments;
CREATE POLICY "Users can create comments" ON public.presentation_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can update own comments" ON public.presentation_comments;
CREATE POLICY "Users can update own comments" ON public.presentation_comments
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    viewer_user_id IS NOT NULL
  );


-- ============================================
-- Migration: 20250119000004_make_user_id_nullable.sql
-- ============================================

-- Make user_id nullable in user_progress table to support viewer users
ALTER TABLE public.user_progress 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or viewer_user_id is present
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_check;

ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_user_check 
CHECK (user_id IS NOT NULL OR viewer_user_id IS NOT NULL);

-- Update unique constraint to handle both types of users
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_presentation_id_key;

-- Create unique index that handles both user types
DROP INDEX IF EXISTS user_progress_auth_user_presentation;
CREATE UNIQUE INDEX user_progress_auth_user_presentation 
ON public.user_progress(user_id, presentation_id) 
WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS user_progress_viewer_user_presentation;
CREATE UNIQUE INDEX user_progress_viewer_user_presentation 
ON public.user_progress(viewer_user_id, presentation_id) 
WHERE viewer_user_id IS NOT NULL;

-- Make user_id nullable in other related tables
ALTER TABLE public.presentation_sessions 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.search_history 
ALTER COLUMN user_id DROP NOT NULL;

-- presentation_ratings, user_bookmarks, presentation_comments already have nullable user_id from their creation



-- ============================================
-- Migration: 20250119000005_add_user_answers_column.sql
-- ============================================

-- Add user_answers column to user_progress table to persist answers across sessions
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS user_answers jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_progress.user_answers IS 'Stores user answers for each slide to allow resume with previous answers';


-- ============================================
-- Migration: 20250119000006_add_best_score.sql
-- ============================================

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


-- ============================================
-- Migration: 20250120000001_add_display_order_to_presentations.sql
-- ============================================

-- Add display_order column to presentations table
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_presentations_display_order ON presentations(display_order);

-- Set initial display_order values based on creation date
WITH numbered_presentations AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) - 1 AS row_num
  FROM presentations
)
UPDATE presentations
SET display_order = numbered_presentations.row_num
FROM numbered_presentations
WHERE presentations.id = numbered_presentations.id
  AND presentations.display_order IS NULL;


-- ============================================
-- Migration: 20250120000001_add_user_progress_updated_at.sql
-- ============================================

-- Add updated_at column to user_progress table
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS user_progress_updated_at ON public.user_progress;

-- Create trigger
CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_updated_at();

COMMENT ON COLUMN public.user_progress.updated_at IS 'Timestamp of last update to this progress record';


-- ============================================
-- Migration: 20250120000001_fix_security_issues.sql
-- ============================================

-- Fix Supabase Security Linter Issues
-- Date: 2025-01-20

-- ============================================
-- 1. ENABLE RLS ON TABLES (ERRORS)
-- ============================================

-- Enable RLS on quiz_questions
ALTER TABLE IF EXISTS public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on media_files
ALTER TABLE IF EXISTS public.media_files ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for quiz_questions
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Authenticated users can manage quiz questions" ON public.quiz_questions
  FOR ALL USING (auth.role() = 'authenticated');

-- Add RLS policies for media_files
DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
CREATE POLICY "Anyone can view media files" ON public.media_files
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage media files" ON public.media_files;
CREATE POLICY "Authenticated users can manage media files" ON public.media_files
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 2. FIX FUNCTION SEARCH_PATH (WARNINGS)
-- ============================================

-- Fix update_user_progress_updated_at
CREATE OR REPLACE FUNCTION public.update_user_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_viewer_user_updated_at
CREATE OR REPLACE FUNCTION public.update_viewer_user_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix create_viewer_user_profile - just recreate with search_path (no need to drop)
CREATE OR REPLACE FUNCTION public.create_viewer_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.viewer_users (id, email, username, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix increment_presentation_views
DROP FUNCTION IF EXISTS public.increment_presentation_views(UUID);
CREATE FUNCTION public.increment_presentation_views(presentation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.presentations
  SET view_count = COALESCE(view_count, 0) + 1,
      last_viewed_at = NOW()
  WHERE id = presentation_id;
END;
$$;

-- Fix update_presentation_stats
CREATE OR REPLACE FUNCTION public.update_presentation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update presentation statistics when related records change
  RETURN NEW;
END;
$$;

-- Fix get_trending_presentations
DROP FUNCTION IF EXISTS public.get_trending_presentations(INT);
CREATE FUNCTION public.get_trending_presentations(p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  view_count BIGINT,
  category_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.description, COALESCE(p.view_count, 0)::BIGINT, p.category_id
  FROM public.presentations p
  WHERE p.status = 'published'
  ORDER BY p.view_count DESC NULLS LAST, p.updated_at DESC
  LIMIT p_limit;
END;
$$;

-- Fix get_recommended_presentations
DROP FUNCTION IF EXISTS public.get_recommended_presentations(UUID, INT);
CREATE FUNCTION public.get_recommended_presentations(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  category_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.description, p.category_id
  FROM public.presentations p
  WHERE p.status = 'published'
    AND p.id NOT IN (
      SELECT up.presentation_id FROM public.user_progress up WHERE up.viewer_user_id = p_user_id
    )
  ORDER BY p.view_count DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Fix track_search
CREATE OR REPLACE FUNCTION public.track_search(p_query TEXT, p_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.search_history (query, viewer_user_id, searched_at)
  VALUES (p_query, p_user_id, NOW());
END;
$$;

-- Fix track_search_click
CREATE OR REPLACE FUNCTION public.track_search_click(p_search_id UUID, p_presentation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.search_history
  SET clicked_presentation_id = p_presentation_id
  WHERE id = p_search_id;
END;
$$;

-- Fix get_popular_searches
DROP FUNCTION IF EXISTS public.get_popular_searches(INT);
CREATE FUNCTION public.get_popular_searches(p_limit INT DEFAULT 10)
RETURNS TABLE(query TEXT, search_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sh.query, COUNT(*)::BIGINT as search_count
  FROM public.search_history sh
  WHERE sh.searched_at > NOW() - INTERVAL '30 days'
  GROUP BY sh.query
  ORDER BY search_count DESC
  LIMIT p_limit;
END;
$$;

-- Fix update_user_progress
DROP FUNCTION IF EXISTS public.update_user_progress(UUID, UUID, INT, INT);
CREATE FUNCTION public.update_user_progress(
  p_user_id UUID,
  p_presentation_id UUID,
  p_slide_index INT,
  p_progress_percentage INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_progress (viewer_user_id, presentation_id, last_slide_index, progress_percentage, last_accessed_at)
  VALUES (p_user_id, p_presentation_id, p_slide_index, p_progress_percentage, NOW())
  ON CONFLICT (viewer_user_id, presentation_id)
  DO UPDATE SET
    last_slide_index = EXCLUDED.last_slide_index,
    progress_percentage = EXCLUDED.progress_percentage,
    last_accessed_at = NOW();
END;
$$;

-- Fix aggregate_daily_statistics
CREATE OR REPLACE FUNCTION public.aggregate_daily_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Aggregate daily statistics logic
  NULL;
END;
$$;

-- Fix increment_category_views
CREATE OR REPLACE FUNCTION public.increment_category_views(p_category_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.category_views (category_id, viewed_at)
  VALUES (p_category_id, NOW());
END;
$$;

-- Fix update_user_stats
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user statistics when progress changes
  RETURN NEW;
END;
$$;

-- Fix check_and_award_achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check and award achievements logic
  NULL;
END;
$$;

-- Fix update_user_streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user streak logic
  NULL;
END;
$$;

-- Fix mark_notification_read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE id = p_notification_id AND viewer_user_id = p_user_id;
END;
$$;

-- Fix get_leaderboard
DROP FUNCTION IF EXISTS public.get_leaderboard(INT);
CREATE FUNCTION public.get_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  total_points BIGINT,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vu.id,
    vu.username,
    COALESCE(SUM(up.total_points), 0)::BIGINT as total_points,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(up.total_points), 0) DESC)::BIGINT as rank
  FROM public.viewer_users vu
  LEFT JOIN public.user_progress up ON vu.id = up.viewer_user_id
  GROUP BY vu.id, vu.username
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$;

-- Fix get_user_statistics
DROP FUNCTION IF EXISTS public.get_user_statistics(UUID);
CREATE FUNCTION public.get_user_statistics(p_user_id UUID)
RETURNS TABLE(
  total_presentations INT,
  completed_presentations INT,
  total_points BIGINT,
  current_streak INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT up.presentation_id)::INT as total_presentations,
    COUNT(DISTINCT CASE WHEN up.progress_percentage = 100 THEN up.presentation_id END)::INT as completed_presentations,
    COALESCE(SUM(up.total_points), 0)::BIGINT as total_points,
    0::INT as current_streak
  FROM public.user_progress up
  WHERE up.viewer_user_id = p_user_id;
END;
$$;

-- Fix mark_all_notifications_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE viewer_user_id = p_user_id AND read_at IS NULL;
END;
$$;

-- Fix handle_user_update
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.viewer_users (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. NOTE: Auth Settings (Manual in Dashboard)
-- ============================================
-- The following settings need to be configured manually in Supabase Dashboard:
-- 
-- 1. Leaked Password Protection:
--    Go to Authentication > Providers > Email > Enable "Leaked password protection"
--
-- 2. MFA Options:
--    Go to Authentication > MFA > Enable TOTP or other MFA methods
--
-- These cannot be set via SQL migrations.

-- ============================================
-- 4. NOTE: RLS Policies "Always True" Warnings
-- ============================================
-- The following policies use WITH CHECK (true) which is intentional for:
-- - category_views: Anyone can create category views (anonymous tracking)
-- - notifications: System creates notifications (triggered by functions)
-- - presentation_sessions: Anyone can create sessions (anonymous users)
-- - search_history: Anyone can create search history (anonymous tracking)
-- - user_achievements: System creates achievements (triggered by functions)
-- - viewer_users: Anyone can register (public registration)
--
-- These are acceptable for this application's use case.
-- If stricter security is needed, update these policies accordingly.


-- ============================================
-- Migration: 20250120000002_fix_performance_issues.sql
-- ============================================

-- Migration: Fix Performance Issues
-- Date: 2025-01-20
-- Description: Fixes RLS auth function re-evaluation, removes duplicate policies, adds missing indexes

-- ============================================
-- PART 1: Fix auth_rls_initplan issues
-- Replace auth.uid() with (select auth.uid()) in RLS policies
-- ============================================

-- users table (if it exists) - skipped, public.users doesn't exist in our schema
-- DROP POLICY IF EXISTS "Users can view own data" ON public.users;
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
--         EXECUTE 'CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (id = (select auth.uid()))';
--     END IF;
-- END $$;

-- presentations table
DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
-- Create single unified policy for SELECT (handles both anon viewing published and auth viewing all)
CREATE POLICY "Anyone can view presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);
-- Authenticated users can do all operations
CREATE POLICY "Authenticated users can manage presentations" ON public.presentations
    FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- slides table
DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
-- Single policy: anyone can view, authenticated can manage
CREATE POLICY "Anyone can view slides" ON public.slides
    FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage slides" ON public.slides
    FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- categories table
DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
-- Single policy: anyone can view, authenticated can manage
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage categories" ON public.categories
    FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- presentation_sessions table
DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;
-- Combine into single SELECT policy
CREATE POLICY "Users can view sessions" ON public.presentation_sessions
    FOR SELECT USING (
        user_id = (select auth.uid()) 
        OR user_id IS NULL 
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can update own sessions" ON public.presentation_sessions;
CREATE POLICY "Users can update own sessions" ON public.presentation_sessions
    FOR UPDATE USING (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
-- Single INSERT policy
CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions
    FOR INSERT WITH CHECK (TRUE);

-- presentation_ratings table
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.presentation_ratings;
CREATE POLICY "Authenticated users can create ratings" ON public.presentation_ratings
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own ratings" ON public.presentation_ratings;
CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
    FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ratings" ON public.presentation_ratings;
CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
    FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can rate presentations" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can view own ratings" ON public.presentation_ratings;

-- user_bookmarks table
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
    FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;

-- search_history table
DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
CREATE POLICY "Users can view own search history" ON public.search_history
    FOR SELECT USING (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
CREATE POLICY "Users can create search history" ON public.search_history
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Anyone can create search history" ON public.search_history;

-- daily_statistics table
DROP POLICY IF EXISTS "Admins can manage statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Anyone can view daily statistics" ON public.daily_statistics;
-- Single SELECT policy for viewing
CREATE POLICY "Anyone can view daily statistics" ON public.daily_statistics
    FOR SELECT USING (TRUE);
-- Separate policy for admin management (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage statistics" ON public.daily_statistics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = (select auth.uid()) AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = (select auth.uid()) AND role = 'admin'
        )
    );

-- user_profiles table (id is the primary key, references auth.users)
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (id = (select auth.uid()));

-- achievements table
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
-- Single SELECT policy for viewing
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (TRUE);
-- Separate policy for admin management (INSERT, UPDATE, DELETE only)
CREATE POLICY "Admins can manage achievements" ON public.achievements
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can update achievements" ON public.achievements
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can delete achievements" ON public.achievements
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- user_achievements table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (user_id = (select auth.uid()));

-- notifications table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (select auth.uid()));

-- user_learning_paths table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Users can view own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can view own learning paths" ON public.user_learning_paths
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can create own learning paths" ON public.user_learning_paths
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can update own learning paths" ON public.user_learning_paths
    FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can delete own learning paths" ON public.user_learning_paths
    FOR DELETE USING (user_id = (select auth.uid()));

-- presentation_comments table (user_id references user_profiles.id)
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.presentation_comments;
CREATE POLICY "Authenticated users can create comments" ON public.presentation_comments
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.presentation_comments;
CREATE POLICY "Users can delete own comments" ON public.presentation_comments
    FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create comments" ON public.presentation_comments;

DROP POLICY IF EXISTS "Users can update own comments" ON public.presentation_comments;
CREATE POLICY "Users can update own comments" ON public.presentation_comments
    FOR UPDATE USING (user_id = (select auth.uid()));

-- quiz_questions table
DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
-- Single SELECT policy
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
    FOR SELECT USING (TRUE);
-- Separate policies for authenticated management
CREATE POLICY "Authenticated users can insert quiz questions" ON public.quiz_questions
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update quiz questions" ON public.quiz_questions
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete quiz questions" ON public.quiz_questions
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- media_files table
DROP POLICY IF EXISTS "Authenticated users can manage media files" ON public.media_files;
DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
-- Single SELECT policy
CREATE POLICY "Anyone can view media files" ON public.media_files
    FOR SELECT USING (TRUE);
-- Separate policies for authenticated management
CREATE POLICY "Authenticated users can insert media files" ON public.media_files
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update media files" ON public.media_files
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete media files" ON public.media_files
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- viewer_users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
CREATE POLICY "Users can view own profile" ON public.viewer_users
    FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
CREATE POLICY "Users can update own profile" ON public.viewer_users
    FOR UPDATE USING (id = (select auth.uid()));

-- user_progress table
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- PART 2: Remove remaining duplicate permissive policies
-- These policies exist from previous migrations and cause duplicates
-- ============================================

-- Drop duplicates that may exist from earlier migrations
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;

-- ============================================
-- PART 3: Add missing indexes for foreign keys
-- ============================================

-- media_files.uploaded_by
CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by 
    ON public.media_files(uploaded_by);

-- presentation_comments.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_presentation_comments_viewer_user_id 
    ON public.presentation_comments(viewer_user_id);

-- presentation_ratings.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_presentation_ratings_viewer_user_id 
    ON public.presentation_ratings(viewer_user_id);

-- presentation_sessions.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_viewer_user_id 
    ON public.presentation_sessions(viewer_user_id);

-- search_history.clicked_presentation_id
CREATE INDEX IF NOT EXISTS idx_search_history_clicked_presentation_id 
    ON public.search_history(clicked_presentation_id);

-- search_history.user_id
CREATE INDEX IF NOT EXISTS idx_search_history_user_id 
    ON public.search_history(user_id);

-- search_history.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_search_history_viewer_user_id 
    ON public.search_history(viewer_user_id);

-- user_bookmarks.viewer_user_id
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_viewer_user_id 
    ON public.user_bookmarks(viewer_user_id);

-- ============================================
-- PART 4: Note about unused indexes
-- These indexes are flagged as unused but may be needed in the future.
-- Keeping them for now as they don't significantly impact write performance.
-- Monitor usage over time before removing.
-- ============================================

-- Unused indexes (kept for future use):
-- idx_presentations_display_order
-- idx_quiz_questions_quiz_id
-- idx_quiz_questions_sort_order
-- idx_user_profiles_username
-- idx_user_profiles_role
-- idx_user_achievements_user_id
-- idx_user_achievements_achievement_id
-- idx_notifications_is_read
-- idx_notifications_user_id
-- idx_user_learning_paths_user_id
-- idx_presentation_comments_user_id
-- idx_presentation_comments_parent_id
-- idx_presentations_view_count
-- idx_presentations_updated_at
-- idx_presentations_status
-- idx_presentations_created_by
-- idx_slides_sort_order
-- idx_categories_parent_id
-- idx_presentations_category_id
-- idx_presentation_sessions_user_id
-- idx_presentation_sessions_started_at
-- idx_presentation_sessions_completed
-- idx_presentation_ratings_user_id
-- idx_presentation_ratings_rating
-- idx_user_bookmarks_user_id
-- idx_user_progress_user_id
-- idx_user_progress_presentation_id
-- idx_search_history_search_query
-- idx_search_history_created_at
-- idx_category_views_category_id
-- idx_presentations_tags
-- idx_presentations_difficulty
-- idx_presentations_featured
-- idx_presentations_completion_count
-- idx_presentations_average_score
-- idx_viewer_users_email
-- idx_viewer_users_username
-- idx_user_profiles_viewer_user_id
-- idx_categories_sort_order


-- ============================================
-- Migration: 20250120000003_fix_remaining_performance_issues.sql
-- ============================================

-- Migration: Fix Remaining Performance Issues
-- Date: 2025-01-20
-- Description: Fixes remaining duplicate policies and auth function re-evaluation

-- ============================================
-- PART 1: Fix users table policy (SKIPPED - table doesn't exist)
-- ============================================

-- DROP POLICY IF EXISTS "Users can view own data" ON public.users;
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
--         EXECUTE 'CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (id = (select auth.uid()))';
--     END IF;
-- END $$;

-- ============================================
-- PART 2: Fix presentations duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
DROP POLICY IF EXISTS "Anyone can view presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can manage presentations" ON public.presentations;

-- Single SELECT policy (anyone can view published, authenticated can view all)
CREATE POLICY "Anyone can view presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);
-- Authenticated users can INSERT
CREATE POLICY "Authenticated users can insert presentations" ON public.presentations
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
-- Authenticated users can UPDATE
CREATE POLICY "Authenticated users can update presentations" ON public.presentations
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
-- Authenticated users can DELETE
CREATE POLICY "Authenticated users can delete presentations" ON public.presentations
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 3: Fix slides duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Anyone can view slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can manage slides" ON public.slides;

-- Single SELECT policy
CREATE POLICY "Anyone can view slides" ON public.slides
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert slides" ON public.slides
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update slides" ON public.slides
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete slides" ON public.slides
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 4: Fix categories duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;

-- Single SELECT policy
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert categories" ON public.categories
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update categories" ON public.categories
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete categories" ON public.categories
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 5: Fix presentation_sessions duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can view sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;

-- Single SELECT policy combining user and admin access
CREATE POLICY "Users can view sessions" ON public.presentation_sessions
    FOR SELECT USING (
        user_id = (select auth.uid()) 
        OR user_id IS NULL 
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- Single INSERT policy
CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions
    FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- PART 6: Fix achievements duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can update achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can delete achievements" ON public.achievements;

-- Single SELECT policy
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (TRUE);
-- Admin-only write policies
CREATE POLICY "Admins can insert achievements" ON public.achievements
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can update achievements" ON public.achievements
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can delete achievements" ON public.achievements
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- ============================================
-- PART 7: Fix daily_statistics duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Admins can manage statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Anyone can view daily statistics" ON public.daily_statistics;

-- Single SELECT policy
CREATE POLICY "Anyone can view daily statistics" ON public.daily_statistics
    FOR SELECT USING (TRUE);
-- Admin-only write policies
CREATE POLICY "Admins can insert statistics" ON public.daily_statistics
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can update statistics" ON public.daily_statistics
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );
CREATE POLICY "Admins can delete statistics" ON public.daily_statistics
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- ============================================
-- PART 8: Fix quiz_questions duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can insert quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can update quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can delete quiz questions" ON public.quiz_questions;

-- Single SELECT policy
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert quiz questions" ON public.quiz_questions
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update quiz questions" ON public.quiz_questions
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete quiz questions" ON public.quiz_questions
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- PART 9: Fix media_files duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can manage media files" ON public.media_files;
DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can insert media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can update media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can delete media files" ON public.media_files;

-- Single SELECT policy
CREATE POLICY "Anyone can view media files" ON public.media_files
    FOR SELECT USING (TRUE);
-- Separate management policies
CREATE POLICY "Authenticated users can insert media files" ON public.media_files
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update media files" ON public.media_files
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete media files" ON public.media_files
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);


-- ============================================
-- Migration: 20250120000004_fix_user_progress_rls.sql
-- ============================================

-- Migration: Fix user_progress RLS policies
-- Date: 2025-01-20
-- Description: Allows both auth.users and viewer_users to save progress

-- First, add unique constraint for upsert to work (if not exists)
DO $$
BEGIN
    -- Add unique constraint for viewer_user_id + presentation_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_progress_viewer_user_presentation_unique'
    ) THEN
        -- Check if viewer_user_id column exists before creating constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_progress' 
            AND column_name = 'viewer_user_id'
        ) THEN
            EXECUTE 'ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_viewer_user_presentation_unique UNIQUE (viewer_user_id, presentation_id)';
        END IF;
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

-- Check if viewer_user_id column exists and create appropriate policies
DO $$
DECLARE
    has_viewer_user_id boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'viewer_user_id'
    ) INTO has_viewer_user_id;

    IF has_viewer_user_id THEN
        -- Policies that support both user_id and viewer_user_id
        EXECUTE '
            CREATE POLICY "Users can view own progress" ON public.user_progress
            FOR SELECT USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
        
        EXECUTE '
            CREATE POLICY "Users can create own progress" ON public.user_progress
            FOR INSERT WITH CHECK (
                (user_id = (select auth.uid()) OR user_id IS NULL)
                OR (viewer_user_id = (select auth.uid()) OR viewer_user_id IS NULL)
            )';
        
        EXECUTE '
            CREATE POLICY "Users can update own progress" ON public.user_progress
            FOR UPDATE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
    ELSE
        -- Policies that only use user_id
        EXECUTE '
            CREATE POLICY "Users can view own progress" ON public.user_progress
            FOR SELECT USING (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can create own progress" ON public.user_progress
            FOR INSERT WITH CHECK (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can update own progress" ON public.user_progress
            FOR UPDATE USING (user_id = (select auth.uid()))';
    END IF;
END $$;

-- Also fix user_bookmarks if it has similar issues
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;

DO $$
DECLARE
    has_viewer_user_id boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'viewer_user_id'
    ) INTO has_viewer_user_id;

    IF has_viewer_user_id THEN
        EXECUTE '
            CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
            FOR SELECT USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
        
        EXECUTE '
            CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
            FOR INSERT WITH CHECK (
                (user_id = (select auth.uid()) OR user_id IS NULL)
                OR (viewer_user_id = (select auth.uid()) OR viewer_user_id IS NULL)
            )';
        
        EXECUTE '
            CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
            FOR DELETE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
    ELSE
        EXECUTE '
            CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
            FOR SELECT USING (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
            FOR INSERT WITH CHECK (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
            FOR DELETE USING (user_id = (select auth.uid()))';
    END IF;
END $$;

-- Fix presentation_ratings too
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.presentation_ratings;

DO $$
DECLARE
    has_viewer_user_id boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'presentation_ratings' 
        AND column_name = 'viewer_user_id'
    ) INTO has_viewer_user_id;

    IF has_viewer_user_id THEN
        EXECUTE '
            CREATE POLICY "Users can create ratings" ON public.presentation_ratings
            FOR INSERT WITH CHECK (
                (user_id = (select auth.uid()) OR user_id IS NULL)
                OR (viewer_user_id = (select auth.uid()) OR viewer_user_id IS NULL)
            )';
        
        EXECUTE '
            CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
            FOR UPDATE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
        
        EXECUTE '
            CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
            FOR DELETE USING (
                user_id = (select auth.uid()) 
                OR viewer_user_id = (select auth.uid())
            )';
    ELSE
        EXECUTE '
            CREATE POLICY "Users can create ratings" ON public.presentation_ratings
            FOR INSERT WITH CHECK (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
            FOR UPDATE USING (user_id = (select auth.uid()))';
        
        EXECUTE '
            CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
            FOR DELETE USING (user_id = (select auth.uid()))';
    END IF;
END $$;


-- ============================================
-- Migration: 20250120000005_add_user_progress_constraint.sql
-- ============================================

-- Quick fix: Add unique constraint for user_progress upsert (with DROP IF EXISTS)
-- Run this in Supabase SQL Editor

-- Add unique constraint for viewer_user_id + presentation_id
ALTER TABLE public.user_progress 
DROP CONSTRAINT IF EXISTS user_progress_viewer_user_presentation_unique;

ALTER TABLE public.user_progress 
ADD CONSTRAINT user_progress_viewer_user_presentation_unique 
UNIQUE (viewer_user_id, presentation_id);


-- ============================================
-- Migration: 20250120000006_comprehensive_rls_fix.sql
-- ============================================

-- Migration: Comprehensive RLS Policy Fix
-- Date: 2025-01-20
-- Description: Fixes all RLS policies to properly support viewer users

-- ============================================
-- PART 1: user_progress table
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

-- Create proper policies for viewer users
-- SELECT: Users can view their own progress
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- INSERT: Users can create progress where viewer_user_id matches their auth.uid()
CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- UPDATE: Users can update their own progress
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 2: user_bookmarks table
-- ============================================

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;

CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 3: presentation_sessions table
-- ============================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can view sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;

-- Anyone can create sessions (for anonymous tracking too)
CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions
    FOR INSERT WITH CHECK (TRUE);

-- Users can view their own sessions or anonymous sessions
CREATE POLICY "Users can view own sessions" ON public.presentation_sessions
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
        OR (user_id IS NULL AND viewer_user_id IS NULL)
    );

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON public.presentation_sessions
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
        OR (user_id IS NULL AND viewer_user_id IS NULL)
    );

-- ============================================
-- PART 4: presentation_ratings table
-- ============================================

DROP POLICY IF EXISTS "Users can create ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can rate presentations" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Users can view own ratings" ON public.presentation_ratings;
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.presentation_ratings;

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings" ON public.presentation_ratings
    FOR SELECT USING (TRUE);

-- Users can create ratings
CREATE POLICY "Users can create ratings" ON public.presentation_ratings
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON public.presentation_ratings
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings" ON public.presentation_ratings
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 5: presentation_comments table
-- ============================================

DROP POLICY IF EXISTS "Anyone can view comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.presentation_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.presentation_comments;

-- Anyone can view comments
CREATE POLICY "Anyone can view comments" ON public.presentation_comments
    FOR SELECT USING (TRUE);

-- Users can create comments
CREATE POLICY "Users can create comments" ON public.presentation_comments
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.presentation_comments
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.presentation_comments
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 6: search_history table
-- ============================================

DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
DROP POLICY IF EXISTS "Anyone can create search history" ON public.search_history;

-- Anyone can create search history (for analytics)
CREATE POLICY "Anyone can create search history" ON public.search_history
    FOR INSERT WITH CHECK (TRUE);

-- Users can view their own search history
CREATE POLICY "Users can view own search history" ON public.search_history
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
        OR (user_id IS NULL AND viewer_user_id IS NULL)
    );

-- ============================================
-- PART 7: viewer_users table
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.viewer_users;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.viewer_users
    FOR SELECT USING (id = (select auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.viewer_users
    FOR UPDATE USING (id = (select auth.uid()));

-- Users can insert their own profile (for new user creation)
CREATE POLICY "Users can insert own profile" ON public.viewer_users
    FOR INSERT WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PART 8: user_profiles table
-- ============================================

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Anyone can view profiles (for leaderboards, etc.)
CREATE POLICY "Anyone can view profiles" ON public.user_profiles
    FOR SELECT USING (TRUE);

-- Users can create their own profile
CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (
        id = (select auth.uid())
        OR viewer_user_id = (select auth.uid())
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (
        id = (select auth.uid())
        OR viewer_user_id = (select auth.uid())
    );

-- ============================================
-- PART 9: user_achievements table
-- ============================================

DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (user_id = (select auth.uid()));

-- ============================================
-- PART 10: notifications table
-- ============================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- PART 11: user_learning_paths table
-- ============================================

DROP POLICY IF EXISTS "Users can view own learning paths" ON public.user_learning_paths;
DROP POLICY IF EXISTS "Users can create own learning paths" ON public.user_learning_paths;
DROP POLICY IF EXISTS "Users can update own learning paths" ON public.user_learning_paths;
DROP POLICY IF EXISTS "Users can delete own learning paths" ON public.user_learning_paths;

CREATE POLICY "Users can view own learning paths" ON public.user_learning_paths
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own learning paths" ON public.user_learning_paths
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own learning paths" ON public.user_learning_paths
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own learning paths" ON public.user_learning_paths
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- PART 12: Public read access tables
-- ============================================

-- presentations
DROP POLICY IF EXISTS "Anyone can view presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can manage presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can insert presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can update presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can delete presentations" ON public.presentations;

CREATE POLICY "Anyone can view published presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert presentations" ON public.presentations
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update presentations" ON public.presentations
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete presentations" ON public.presentations
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- slides
DROP POLICY IF EXISTS "Anyone can view slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can manage slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can insert slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can update slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can delete slides" ON public.slides;

CREATE POLICY "Anyone can view slides" ON public.slides
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert slides" ON public.slides
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update slides" ON public.slides
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete slides" ON public.slides
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert categories" ON public.categories
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update categories" ON public.categories
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories" ON public.categories
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- achievements
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can insert achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can update achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can delete achievements" ON public.achievements;

CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert achievements" ON public.achievements
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can update achievements" ON public.achievements
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can delete achievements" ON public.achievements
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- daily_statistics
DROP POLICY IF EXISTS "Anyone can view daily statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can manage statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can insert statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can update statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Admins can delete statistics" ON public.daily_statistics;

CREATE POLICY "Anyone can view daily statistics" ON public.daily_statistics
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert statistics" ON public.daily_statistics
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can update statistics" ON public.daily_statistics
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can delete statistics" ON public.daily_statistics
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- quiz_questions
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can insert quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can update quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can delete quiz questions" ON public.quiz_questions;

CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert quiz questions" ON public.quiz_questions
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update quiz questions" ON public.quiz_questions
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete quiz questions" ON public.quiz_questions
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- media_files
DROP POLICY IF EXISTS "Anyone can view media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can manage media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can insert media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can update media files" ON public.media_files;
DROP POLICY IF EXISTS "Authenticated users can delete media files" ON public.media_files;

CREATE POLICY "Anyone can view media files" ON public.media_files
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert media files" ON public.media_files
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update media files" ON public.media_files
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete media files" ON public.media_files
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- category_views
DROP POLICY IF EXISTS "Anyone can view category views" ON public.category_views;
DROP POLICY IF EXISTS "Anyone can insert category views" ON public.category_views;

CREATE POLICY "Anyone can view category views" ON public.category_views
    FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can insert category views" ON public.category_views
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Anyone can update category views" ON public.category_views
    FOR UPDATE USING (TRUE);


-- ============================================
-- Migration: 20250120000007_add_viewer_user_id_columns.sql
-- ============================================

-- Migration: Add viewer_user_id column to user_progress and fix RLS
-- Date: 2025-01-20
-- Description: Adds viewer_user_id column to support viewer users and fixes RLS policies

-- ============================================
-- PART 1: Add viewer_user_id column to user_progress
-- ============================================

-- Add viewer_user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'viewer_user_id'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make user_id nullable (since we now support viewer_user_id as alternative)
ALTER TABLE public.user_progress ALTER COLUMN user_id DROP NOT NULL;

-- Add unique constraint for viewer_user_id + presentation_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_progress_viewer_user_presentation_unique'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD CONSTRAINT user_progress_viewer_user_presentation_unique 
        UNIQUE (viewer_user_id, presentation_id);
    END IF;
END $$;

-- Create index for viewer_user_id
CREATE INDEX IF NOT EXISTS idx_user_progress_viewer_user_id ON public.user_progress(viewer_user_id);

-- ============================================
-- PART 2: Add viewer_user_id to user_bookmarks if missing
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'viewer_user_id'
    ) THEN
        ALTER TABLE public.user_bookmarks 
        ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make user_id nullable for user_bookmarks
DO $$
BEGIN
    -- Check if user_id column exists and is not null
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_bookmarks ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- Add unique constraint for viewer_user_id + presentation_id on user_bookmarks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_bookmarks_viewer_user_presentation_unique'
    ) THEN
        ALTER TABLE public.user_bookmarks 
        ADD CONSTRAINT user_bookmarks_viewer_user_presentation_unique 
        UNIQUE (viewer_user_id, presentation_id);
    END IF;
END $$;

-- ============================================
-- PART 3: Fix user_progress RLS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Create new policies that support both user_id and viewer_user_id
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can delete own progress" ON public.user_progress
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 4: Fix user_bookmarks RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;

CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- PART 5: Ensure RLS is enabled
-- ============================================

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Migration: 20250120000008_complete_fix.sql
-- ============================================

-- Migration: Complete fix for user_progress and related tables
-- Date: 2025-01-20
-- Description: Adds missing viewer_user_id columns and fixes all RLS policies
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR

-- ============================================
-- STEP 1: Add viewer_user_id column to user_progress
-- ============================================

-- Check if viewer_users table exists first
DO $$
BEGIN
    -- Add viewer_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'viewer_user_id'
    ) THEN
        -- Check if viewer_users table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'viewer_users'
        ) THEN
            ALTER TABLE public.user_progress 
            ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
        ELSE
            -- Add without foreign key if viewer_users doesn't exist
            ALTER TABLE public.user_progress ADD COLUMN viewer_user_id uuid;
        END IF;
    END IF;
END $$;

-- Make user_id nullable (so we can use viewer_user_id instead)
DO $$
BEGIN
    -- Check if user_id is NOT NULL constrained
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_progress ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- Add unique constraint for upsert operations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_progress_viewer_user_presentation_unique'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD CONSTRAINT user_progress_viewer_user_presentation_unique 
        UNIQUE (viewer_user_id, presentation_id);
    END IF;
END $$;

-- Create index for viewer_user_id
CREATE INDEX IF NOT EXISTS idx_user_progress_viewer_user_id 
ON public.user_progress(viewer_user_id);

-- ============================================
-- STEP 2: Add viewer_user_id to user_bookmarks
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'viewer_user_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'viewer_users'
        ) THEN
            ALTER TABLE public.user_bookmarks 
            ADD COLUMN viewer_user_id uuid REFERENCES public.viewer_users(id) ON DELETE CASCADE;
        ELSE
            ALTER TABLE public.user_bookmarks ADD COLUMN viewer_user_id uuid;
        END IF;
    END IF;
    
    -- Make user_id nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bookmarks' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_bookmarks ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- ============================================
-- STEP 3: Ensure RLS is enabled on all tables
-- ============================================

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Fix user_progress RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- SELECT: Users can view their own progress
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- INSERT: Users can create their own progress
CREATE POLICY "Users can create own progress" ON public.user_progress
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- UPDATE: Users can update their own progress
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- STEP 5: Fix user_bookmarks RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;

CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
    FOR SELECT USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can create own bookmarks" ON public.user_bookmarks
    FOR INSERT WITH CHECK (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
    FOR DELETE USING (
        viewer_user_id = (select auth.uid())
        OR user_id = (select auth.uid())
    );

-- ============================================
-- STEP 6: Fix presentations RLS policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can view presentations" ON public.presentations;
DROP POLICY IF EXISTS "Anyone can view published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can manage presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public read access to published presentations" ON public.presentations;
DROP POLICY IF EXISTS "Allow anonymous to increment view count" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can insert presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can update presentations" ON public.presentations;
DROP POLICY IF EXISTS "Authenticated users can delete presentations" ON public.presentations;

-- Anyone can view published presentations, authenticated can view all
CREATE POLICY "Anyone can view presentations" ON public.presentations
    FOR SELECT USING (status = 'published' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert presentations" ON public.presentations
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update presentations" ON public.presentations
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete presentations" ON public.presentations
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- STEP 7: Fix slides RLS policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can view slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can manage slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users full access to slides" ON public.slides;
DROP POLICY IF EXISTS "Public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can insert slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can update slides" ON public.slides;
DROP POLICY IF EXISTS "Authenticated users can delete slides" ON public.slides;

CREATE POLICY "Anyone can view slides" ON public.slides
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert slides" ON public.slides
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update slides" ON public.slides
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete slides" ON public.slides
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- STEP 8: Fix categories RLS policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert categories" ON public.categories
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update categories" ON public.categories
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories" ON public.categories
    FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================
-- STEP 9: Fix viewer_users RLS policies
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'viewer_users') THEN
        ALTER TABLE public.viewer_users ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own profile" ON public.viewer_users;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.viewer_users;
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.viewer_users;
        
        EXECUTE 'CREATE POLICY "Users can view own profile" ON public.viewer_users FOR SELECT USING (id = (select auth.uid()))';
        EXECUTE 'CREATE POLICY "Users can update own profile" ON public.viewer_users FOR UPDATE USING (id = (select auth.uid()))';
        EXECUTE 'CREATE POLICY "Users can insert own profile" ON public.viewer_users FOR INSERT WITH CHECK (id = (select auth.uid()))';
    END IF;
END $$;

-- ============================================
-- STEP 10: Fix presentation_sessions RLS
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'presentation_sessions') THEN
        ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Users can view sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Users can update own sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Users can create sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Anyone can create sessions" ON public.presentation_sessions;
        DROP POLICY IF EXISTS "Admins can view all sessions" ON public.presentation_sessions;
        
        EXECUTE 'CREATE POLICY "Anyone can create sessions" ON public.presentation_sessions FOR INSERT WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY "Users can view own sessions" ON public.presentation_sessions FOR SELECT USING (viewer_user_id = (select auth.uid()) OR user_id = (select auth.uid()) OR (user_id IS NULL AND viewer_user_id IS NULL))';
        EXECUTE 'CREATE POLICY "Users can update own sessions" ON public.presentation_sessions FOR UPDATE USING (viewer_user_id = (select auth.uid()) OR user_id = (select auth.uid()) OR (user_id IS NULL AND viewer_user_id IS NULL))';
    END IF;
END $$;

-- ============================================
-- DONE! Verify the changes
-- ============================================

-- You can verify the viewer_user_id column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_progress' AND table_schema = 'public';



