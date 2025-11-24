import React, { useState, useEffect } from 'react';
import { Category, createCategory, updateCategory } from '../../services/CategoryService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { FolderPlus, Upload, X } from 'lucide-react';
import { supabase } from '../../../supabase/supabase';
import { toast } from '../ui/use-toast';

interface CategoryDialogProps {
  categories: Category[];
  onCategoryCreated: () => void;
  editingCategory?: Category | null;
  onEditComplete?: () => void;
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({ categories, onCategoryCreated, editingCategory, onEditComplete }) => {
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parent_id: null as string | null });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const isEditMode = !!editingCategory;

  useEffect(() => {
    if (editingCategory) {
      setNewCategory({
        name: editingCategory.name,
        description: editingCategory.description || '',
        parent_id: editingCategory.parent_id
      });
      setImagePreview(editingCategory.image_url || null);
      setShowCategoryDialog(true);
    }
  }, [editingCategory]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSaveCategory = async () => {
    let imageUrl = editingCategory?.image_url || null;
    
    // Upload image if a new file was selected
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `category-images/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('presentation-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: 'Hiba',
          description: uploadError.message || 'A kép feltöltése sikertelen',
          variant: 'destructive',
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('presentation-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    const categoryData = {
      ...newCategory,
      image_url: imageUrl
    };

    if (isEditMode && editingCategory) {
      await updateCategory(editingCategory.id, categoryData);
      if (onEditComplete) onEditComplete();
    } else {
      await createCategory(categoryData);
      onCategoryCreated();
    }
    setShowCategoryDialog(false);
    setNewCategory({ name: '', description: '', parent_id: null });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleDialogChange = (open: boolean) => {
    setShowCategoryDialog(open);
    if (!open) {
      setNewCategory({ name: '', description: '', parent_id: null });
      setImageFile(null);
      setImagePreview(null);
      if (onEditComplete) onEditComplete();
    }
  };

  const flattenCategories = (cats: Category[], level = 0): (Category & { level: number })[] => {
    let result: (Category & { level: number })[] = [];
    cats.forEach(cat => {
      result.push({ ...cat, level });
      if (cat.children) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  return (
    <Dialog open={showCategoryDialog} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <FolderPlus className="h-4 w-4 mr-2" />
          Új Témakör
        </Button>
      </DialogTrigger>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Témakör Szerkesztése' : 'Témakör Létrehozása'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Név</Label>
            <Input
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="Témakör neve"
            />
          </div>
          <div>
            <Label>Leírás</Label>
            <Textarea
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              placeholder="Témakör leírása (opcionális)"
              rows={3}
            />
          </div>
          <div>
            <Label>Szülő témakör</Label>
            <Select
              value={newCategory.parent_id || 'none'}
              onValueChange={(value) => setNewCategory({ ...newCategory, parent_id: value === 'none' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válassz szülőt (opcionális)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nincs szülő</SelectItem>
                {flattenCategories(categories)
                  .filter(cat => !isEditMode || cat.id !== editingCategory?.id)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {'  '.repeat(cat.level)}
                      {cat.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Témakör Kép</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    loading="lazy"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-500">Kép feltöltése</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>
          
          <Button onClick={handleSaveCategory} disabled={!newCategory.name}>
            {isEditMode ? 'Témakör Frissítése' : 'Témakör Létrehozása'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
