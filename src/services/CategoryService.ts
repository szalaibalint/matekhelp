import { supabase } from '../../supabase/supabase';
import { toast } from '../components/ui/use-toast';

export interface Category {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  image_url?: string | null;
  children?: Category[];
}

export const loadCategories = async (): Promise<Category[]> => {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  if (data) {
    return buildCategoryTree(data);
  }
  return [];
};

export const buildCategoryTree = (flatCategories: any[]): Category[] => {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  flatCategories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  flatCategories.forEach(cat => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children!.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  return rootCategories;
};

export const createCategory = async (newCategory: { name: string; description: string; parent_id: string | null; image_url?: string | null }) => {
  try {
    const { error } = await supabase
      .from('categories')
      .insert({
        name: newCategory.name,
        description: newCategory.description,
        parent_id: newCategory.parent_id,
        image_url: newCategory.image_url || null
      });

    if (error) throw error;

    toast({
      title: 'Siker',
      description: 'A témakör sikeresen létrehozva',
    });
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
  }
};

export const updateCategory = async (categoryId: string, updates: { name: string; description: string; parent_id: string | null; image_url?: string | null }) => {
  try {
    const { error } = await supabase
      .from('categories')
      .update({
        name: updates.name,
        description: updates.description,
        parent_id: updates.parent_id,
        image_url: updates.image_url
      })
      .eq('id', categoryId);

    if (error) throw error;

    toast({
      title: 'Siker',
      description: 'A témakör sikeresen frissítve',
    });
  } catch (error: any) {
    toast({
      title: 'Hiba',
      description: error.message,
      variant: 'destructive',
    });
  }
};

export const moveCategoryToParent = async (categoryId: string, newParentId: string | null) => {
  try {
    const { error } = await supabase
      .from('categories')
      .update({ parent_id: newParentId })
      .eq('id', categoryId);

    if (error) throw error;

    toast({
      title: 'Siker',
      description: 'A témakör sikeresen áthelyezve',
    });
  } catch (error: any) {
    toast({
      title: 'Hiba',
      description: error.message,
      variant: 'destructive',
    });
  }
};

export const reorderCategories = async (categoryId: string, newParentId: string | null, insertBeforeId: string | null) => {
  try {
    // Get all categories at the target level
    let query = supabase
      .from('categories')
      .select('*');
    
    if (newParentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', newParentId);
    }
    
    const { data: targetLevelCategories } = await query.order('sort_order');

    if (!targetLevelCategories) return;

    // Remove the dragged category from the list if it's in the same level
    const filteredCategories = targetLevelCategories.filter(c => c.id !== categoryId);

    // Find insert position
    let insertIndex = filteredCategories.length;
    if (insertBeforeId) {
      insertIndex = filteredCategories.findIndex(c => c.id === insertBeforeId);
      if (insertIndex === -1) insertIndex = filteredCategories.length;
    }

    // Insert the category at the new position
    filteredCategories.splice(insertIndex, 0, { id: categoryId });

    // Update sort_order for all categories at this level
    const updates = filteredCategories.map((cat, index) => ({
      id: cat.id,
      sort_order: index,
      parent_id: newParentId
    }));

    // Batch update
    for (const update of updates) {
      await supabase
        .from('categories')
        .update({ sort_order: update.sort_order, parent_id: update.parent_id })
        .eq('id', update.id);
    }

    toast({
      title: 'Siker',
      description: 'A témakör sorrendje sikeresen frissítve',
    });
  } catch (error: any) {
    toast({
      title: 'Hiba',
      description: error.message,
      variant: 'destructive',
    });
  }
};

export const deleteCategory = async (deletingCategory: Category) => {
  try {
    // Reassign presentations to the parent category or null
    await supabase
      .from('presentations')
      .update({ category_id: deletingCategory.parent_id || null })
      .eq('category_id', deletingCategory.id);

    // Reassign child categories to the parent category or null
    await supabase
      .from('categories')
      .update({ parent_id: deletingCategory.parent_id || null })
      .eq('parent_id', deletingCategory.id);

    // Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', deletingCategory.id);

    if (error) throw error;

    toast({
      title: 'Siker',
      description: 'A témakör sikeresen törölve',
    });
  } catch (error: any) {
    toast({
      title: 'Hiba',
      description: error.message,
      variant: 'destructive',
    });
  }
};
