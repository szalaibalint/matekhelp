import React from 'react';
import { Category, deleteCategory } from '../../services/CategoryService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteCategoryDialogProps {
  deletingCategory: Category | null;
  onClose: () => void;
  onCategoryDeleted: () => void;
}

export const DeleteCategoryDialog: React.FC<DeleteCategoryDialogProps> = ({
  deletingCategory,
  onClose,
  onCategoryDeleted,
}) => {
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    await deleteCategory(deletingCategory);
    onCategoryDeleted();
    onClose();
  };

  return (
    <AlertDialog open={!!deletingCategory} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Témakör törlése</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Biztosan törölni szeretnéd a "{deletingCategory?.name}" témakört? A benne lévő tananyagok és altémakörök a szülő témakörbe kerülnek (vagy gyökérszintre, ha nincs szülő).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégse</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700">
            Törlés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
