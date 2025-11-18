import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Category } from '../../services/CategoryService';
import { CategoryTree } from './CategoryTree';
import { AlertCircle } from 'lucide-react';

interface BulkMoveCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (categoryId: string) => void;
  selectedCount: number;
  categories: Category[];
}

export function BulkMoveCategoryDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  categories,
}: BulkMoveCategoryDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedCategoryId) {
      onConfirm(selectedCategoryId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Áthelyezés kategóriába</DialogTitle>
          <DialogDescription>
            Válassz ki egy kategóriát, ahová áthelyezed a kiválasztott {selectedCount} tananyagot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md p-4">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mb-3" />
              <p className="text-sm">Még nincsenek kategóriák létrehozva.</p>
            </div>
          ) : (
            <CategoryTree
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onDeleteCategory={() => {}}
              onEditCategory={() => {}}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Mégse
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedCategoryId}>
            Áthelyezés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
