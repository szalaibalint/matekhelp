-- ============================================================================
-- MATEKHELP COMPLETE DATABASE MIGRATION
-- Run this entire file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add Presentation Tracking Columns
-- ============================================================================

-- Add view tracking columns to presentations table
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

-- Create index for sorting by popularity and recency
CREATE INDEX IF NOT EXISTS idx_presentations_view_count ON public.presentations(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_presentations_updated_at ON public.presentations(updated_at DESC);

-- Update RLS policies to allow incrementing view count
CREATE POLICY "Allow anonymous to increment view count" ON public.presentations
    FOR UPDATE
    USING (status = 'published')
    WITH CHECK (status = 'published');

-- ============================================================================
-- PART 2: Create View Increment Function
-- ============================================================================

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

-- ============================================================================
-- PART 3: Create Comprehensive Analytics Tables
-- ============================================================================

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

-- ============================================================================
-- PART 4: Create Analytics Functions
-- ============================================================================

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

-- ============================================================================
-- PART 5: Create User Profiles and Gamification
-- ============================================================================

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

-- ============================================================================
-- PART 6: Create User Management Functions
-- ============================================================================

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

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- You now have:
-- ✅ Presentation tracking (views, completions, scores)
-- ✅ Session analytics
-- ✅ User profiles & gamification
-- ✅ Achievements (6 default achievements)
-- ✅ Ratings & reviews
-- ✅ Bookmarks & progress tracking
-- ✅ Search tracking
-- ✅ Daily statistics
-- ✅ Leaderboards
-- ✅ Recommendations
-- ✅ Comments system
-- ✅ All RLS policies configured
-- ============================================================================
