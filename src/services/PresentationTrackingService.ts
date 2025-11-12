import { supabase } from '../../supabase/supabase';
import { Presentation } from './PresentationService';

export const incrementViewCount = async (presentationId: string) => {
  try {
    // Increment view count
    const { error } = await supabase.rpc('increment_presentation_views', {
      presentation_id: presentationId
    });

    if (error) {
      // Fallback to manual update if function doesn't exist
      const { data: current } = await supabase
        .from('presentations')
        .select('view_count')
        .eq('id', presentationId)
        .single();

      if (current) {
        await supabase
          .from('presentations')
          .update({
            view_count: (current.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', presentationId);
      }
    }
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
};

export const getPopularPresentations = async (limit: number = 10): Promise<Presentation[]> => {
  const { data } = await supabase
    .from('presentations')
    .select('*')
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  return data || [];
};

export const getRecentPresentations = async (limit: number = 10): Promise<Presentation[]> => {
  const { data } = await supabase
    .from('presentations')
    .select('*')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit);

  return data || [];
};
