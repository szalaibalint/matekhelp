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
