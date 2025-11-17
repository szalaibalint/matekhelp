import { supabase } from '../../supabase/supabase';

export interface UserProgress {
  id: string;
  user_id?: string;
  viewer_user_id?: string;
  presentation_id: string;
  last_slide_index: number;
  progress_percentage: number;
  user_answers?: any;
  best_score?: number;
  best_score_percentage?: number;
  total_points?: number;
  attempts?: number;
  last_accessed_at: string;
  presentation?: {
    id: string;
    title: string;
    description: string;
    thumbnail_url?: string;
  };
}

export const UserProgressService = {
  // Save or update progress for a presentation
  async saveProgress(
    presentationId: string,
    currentSlideIndex: number,
    totalSlides: number,
    viewerUserId?: string,
    isCompleted: boolean = false,
    userAnswers?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Cap at 99% if not explicitly marked as completed
      let progressPercentage = Math.round(((currentSlideIndex + 1) / totalSlides) * 100);
      if (!isCompleted && progressPercentage === 100) {
        progressPercentage = 99;
      }

      const progressData: any = {
        presentation_id: presentationId,
        last_slide_index: currentSlideIndex,
        progress_percentage: progressPercentage,
        last_accessed_at: new Date().toISOString(),
      };

      // Save user answers if provided
      if (userAnswers !== undefined) {
        progressData.user_answers = userAnswers;
      }

      if (viewerUserId) {
        progressData.viewer_user_id = viewerUserId;
        
        // Check if progress exists
        const { data: existing, error: fetchError } = await supabase
          .from('user_progress')
          .select('id')
          .eq('presentation_id', presentationId)
          .eq('viewer_user_id', viewerUserId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          // Update existing progress
          const { error: updateError } = await supabase
            .from('user_progress')
            .update(progressData)
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
        } else {
          // Insert new progress
          const { error: insertError } = await supabase
            .from('user_progress')
            .insert(progressData);
          
          if (insertError) throw insertError;
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to save progress:', error);
      return { 
        success: false, 
        error: error.message || 'Nem sikerült menteni a haladást' 
      };
    }
  },

  // Get user's progress for a specific presentation
  async getProgress(presentationId: string, viewerUserId?: string): Promise<UserProgress | null> {
    try {
      if (!viewerUserId) return null;

      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('presentation_id', presentationId)
        .eq('viewer_user_id', viewerUserId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Failed to get progress:', error);
      return null;
    }
  },

  // Get all user progress (both completed and in-progress)
  async getAllUserProgress(viewerUserId?: string): Promise<UserProgress[]> {
    try {
      if (!viewerUserId) return [];

      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('viewer_user_id', viewerUserId)
        .order('last_accessed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get all user progress:', error);
      return [];
    }
  },

  // Get all in-progress presentations for a user
  async getInProgressPresentations(viewerUserId?: string): Promise<UserProgress[]> {
    try {
      if (!viewerUserId) return [];

      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          presentation:presentations(
          id,
          title,
          description,
          thumbnail_url
        )
      `)
      .eq('viewer_user_id', viewerUserId)
      .lt('progress_percentage', 100)
      .order('last_accessed_at', { ascending: false })
      .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get in-progress presentations:', error);
      return [];
    }
  },

  // Get completed presentations for a user
  async getCompletedPresentations(viewerUserId?: string): Promise<UserProgress[]> {
    try {
      if (!viewerUserId) return [];

      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          presentation:presentations(
            id,
            title,
            description,
            thumbnail_url
          )
        `)
        .eq('viewer_user_id', viewerUserId)
        .eq('progress_percentage', 100)
        .order('last_accessed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get completed presentations:', error);
      return [];
    }
  },

  // Get progress for multiple presentations at once
  async getProgressForPresentations(presentationIds: string[], viewerUserId?: string): Promise<Map<string, UserProgress>> {
    try {
      if (!viewerUserId || presentationIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('viewer_user_id', viewerUserId)
        .in('presentation_id', presentationIds);

      if (error) throw error;

      const progressMap = new Map<string, UserProgress>();
      if (data) {
        data.forEach(progress => {
          progressMap.set(progress.presentation_id, progress);
        });
      }
      return progressMap;
    } catch (error: any) {
      console.error('Failed to get progress for presentations:', error);
      return new Map();
    }
  },

  // Mark presentation as completed and save score
  async markAsCompleted(
    presentationId: string, 
    totalSlides: number, 
    viewerUserId?: string,
    score?: number,
    totalPoints?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!viewerUserId) {
        return { success: false, error: 'User not logged in' };
      }

      // Get existing progress to check best score
      const existing = await this.getProgress(presentationId, viewerUserId);
      
      const scorePercentage = totalPoints && totalPoints > 0 
        ? Math.round((score || 0) / totalPoints * 100) 
        : 0;

      const progressData: any = {
        presentation_id: presentationId,
        last_slide_index: totalSlides - 1,
        progress_percentage: 100,
        viewer_user_id: viewerUserId,
        last_accessed_at: new Date().toISOString(),
        attempts: (existing?.attempts || 0) + 1,
      };

      // Update best score if this is better
      if (!existing || !existing.best_score_percentage || scorePercentage > (existing.best_score_percentage || 0)) {
        progressData.best_score = score;
        progressData.best_score_percentage = scorePercentage;
        progressData.total_points = totalPoints;
      }

      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_progress')
        .select('id')
        .eq('presentation_id', presentationId)
        .eq('viewer_user_id', viewerUserId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('user_progress')
          .update(progressData)
          .eq('id', existingRecord.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert(progressData);
        
        if (insertError) throw insertError;
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to mark as completed:', error);
      return { 
        success: false, 
        error: error.message || 'Nem sikerült menteni az eredményt' 
      };
    }
  },
};
