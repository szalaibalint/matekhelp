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
