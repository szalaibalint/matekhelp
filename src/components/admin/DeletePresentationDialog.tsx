import React from 'react';
import { deletePresentation } from '../../services/PresentationService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DeletePresentationDialogProps {
  deletingId: string | null;
  onClose: () => void;
  onPresentationDeleted: () => void;
}

export const DeletePresentationDialog: React.FC<DeletePresentationDialogProps> = ({
  deletingId,
  onClose,
  onPresentationDeleted,
}) => {
  const handleDelete = async () => {
    if (!deletingId) return;
    await deletePresentation(deletingId);
    onPresentationDeleted();
    onClose();
  };

  return (
    <AlertDialog open={!!deletingId} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Tananyag törlése</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Biztosan törölni szeretnéd ezt a tananyagot? Ez a művelet nem vonható vissza, és véglegesen törli az összes diát és tartalmat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégse</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            Törlés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
