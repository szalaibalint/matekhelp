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
