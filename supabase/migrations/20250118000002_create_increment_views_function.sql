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
