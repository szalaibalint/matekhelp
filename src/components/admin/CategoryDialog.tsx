import React, { useState } from 'react';
import { Category, createCategory } from '../../services/CategoryService';
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
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({ categories, onCategoryCreated }) => {
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parent_id: null as string | null });

  const handleCreateCategory = async () => {
    await createCategory(newCategory);
    setShowCategoryDialog(false);
    setNewCategory({ name: '', description: '', parent_id: null });
    onCategoryCreated();
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
    <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <FolderPlus className="h-4 w-4 mr-2" />
          Új Témakör
        </Button>
      </DialogTrigger>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Témakör Létrehozása</DialogTitle>
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
                {flattenCategories(categories).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {'  '.repeat(cat.level)}
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateCategory} disabled={!newCategory.name}>
            Témakör Létrehozása
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
