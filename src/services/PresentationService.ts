import { supabase } from '../../supabase/supabase';
import { toast } from '../components/ui/use-toast';
import { Category } from './CategoryService';

export interface Presentation {
  id: string;
  title: string;
  description: string;
  status: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to get all descendant category IDs
const getAllDescendantIds = (category: Category): string[] => {
  const ids = [category.id];
  if (category.children && category.children.length > 0) {
    category.children.forEach(child => {
      ids.push(...getAllDescendantIds(child));
    });
  }
  return ids;
};

export const loadPresentations = async (categoryId: string | null, categories?: Category[]): Promise<Presentation[]> => {
  let query = supabase
    .from('presentations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (categoryId && categories) {
    // Find the selected category
    const findCategory = (cats: Category[]): Category | null => {
      for (const cat of cats) {
        if (cat.id === categoryId) return cat;
        if (cat.children) {
          const found = findCategory(cat.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const selectedCategory = findCategory(categories);
    if (selectedCategory) {
      // Get all descendant category IDs including the selected one
      const categoryIds = getAllDescendantIds(selectedCategory);
      query = query.in('category_id', categoryIds);
    } else {
      // Fallback to just the selected category if not found in tree
      query = query.eq('category_id', categoryId);
    }
  } else if (categoryId) {
    // Fallback when categories array is not provided
    query = query.eq('category_id', categoryId);
  }

  const { data } = await query;

  return data || [];
};

export const deletePresentation = async (id: string) => {
  await supabase.from('presentations').delete().eq('id', id);
};

export const duplicatePresentation = async (id: string) => {
  const { data: original } = await supabase
    .from('presentations')
    .select('*')
    .eq('id', id)
    .single();

  if (original) {
    const { data: newPres } = await supabase
      .from('presentations')
      .insert({
        title: `${original.title} (Másolat)`,
        description: original.description,
        theme: original.theme,
        settings: original.settings,
        status: 'draft',
        category_id: original.category_id
      })
      .select()
      .single();

    if (newPres) {
      const { data: slides } = await supabase
        .from('slides')
        .select('*')
        .eq('presentation_id', id)
        .order('sort_order');

      if (slides && slides.length > 0) {
        const newSlides = slides.map(slide => ({
          presentation_id: newPres.id,
          type: slide.type,
          title: slide.title,
          content: slide.content,
          settings: slide.settings,
          sort_order: slide.sort_order,
          points: slide.points,
          correct_answer: slide.correct_answer
        }));

        await supabase.from('slides').insert(newSlides);
      }
    }
  }
};

export const updatePresentationSettings = async (editingPresentation: Presentation) => {
  try {
    const { error } = await supabase
      .from('presentations')
      .update({
        title: editingPresentation.title,
        description: editingPresentation.description,
        status: editingPresentation.status,
        category_id: editingPresentation.category_id
      })
      .eq('id', editingPresentation.id);

    if (error) throw error;

    toast({
      title: 'Sikeres',
      description: 'A tananyag beállításai frissültek',
    });
  } catch (error: any) {
    toast({
      title: 'Hiba',
      description: error.message,
      variant: 'destructive',
    });
  }
};
