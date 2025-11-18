import React, { useState, useEffect } from 'react';
import { Category, createCategory, updateCategory } from '../../services/CategoryService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { FolderPlus } from 'lucide-react';

interface CategoryDialogProps {
  categories: Category[];
  onCategoryCreated: () => void;
  editingCategory?: Category | null;
  onEditComplete?: () => void;
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({ categories, onCategoryCreated, editingCategory, onEditComplete }) => {
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parent_id: null as string | null });
  const isEditMode = !!editingCategory;

  useEffect(() => {
    if (editingCategory) {
      setNewCategory({
        name: editingCategory.name,
        description: editingCategory.description || '',
        parent_id: editingCategory.parent_id
      });
      setShowCategoryDialog(true);
    }
  }, [editingCategory]);

  const handleSaveCategory = async () => {
    if (isEditMode && editingCategory) {
      await updateCategory(editingCategory.id, newCategory);
      if (onEditComplete) onEditComplete();
    } else {
      await createCategory(newCategory);
      onCategoryCreated();
    }
    setShowCategoryDialog(false);
    setNewCategory({ name: '', description: '', parent_id: null });
  };

  const handleDialogChange = (open: boolean) => {
    setShowCategoryDialog(open);
    if (!open) {
      setNewCategory({ name: '', description: '', parent_id: null });
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
          <Button onClick={handleSaveCategory} disabled={!newCategory.name}>
            {isEditMode ? 'Témakör Frissítése' : 'Témakör Létrehozása'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
