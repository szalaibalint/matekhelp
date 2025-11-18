import { supabase } from '../../supabase/supabase';
import { toast } from '../components/ui/use-toast';

export interface Category {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
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

export const createCategory = async (newCategory: { name: string; description: string; parent_id: string | null }) => {
  try {
    const { error } = await supabase
      .from('categories')
      .insert({
        name: newCategory.name,
        description: newCategory.description,
        parent_id: newCategory.parent_id
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

export const updateCategory = async (categoryId: string, updates: { name: string; description: string; parent_id: string | null }) => {
  try {
    const { error } = await supabase
      .from('categories')
      .update({
        name: updates.name,
        description: updates.description,
        parent_id: updates.parent_id
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
