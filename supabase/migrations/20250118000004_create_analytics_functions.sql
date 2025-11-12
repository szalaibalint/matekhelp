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
