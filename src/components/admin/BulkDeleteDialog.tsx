import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
}

export function BulkDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: BulkDeleteDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Tananyagok törlése
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Biztosan törölni szeretnéd a kiválasztott {selectedCount} tananyagot?
            <br />
            <span className="font-semibold text-red-600 mt-2 block">
              Ez a művelet nem vonható vissza!
            </span>
            <br />
            Minden dia, válasz és haladási adat véglegesen törlődik.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégse</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Törlés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
