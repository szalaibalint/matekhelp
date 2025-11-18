import { Button } from '../ui/button';
import { 
  Trash2, 
  FolderInput, 
  CheckCircle2, 
  X, 
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

interface BulkOperationsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onMoveToCategory: () => void;
  onChangeStatus: (status: 'draft' | 'published' | 'archived') => void;
}

export function BulkOperationsToolbar({
  selectedCount,
  onClearSelection,
  onDelete,
  onMoveToCategory,
  onChangeStatus,
}: BulkOperationsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900">
            {selectedCount} kiválasztva
          </span>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMoveToCategory}
            className="flex items-center gap-2"
          >
            <FolderInput className="h-4 w-4" />
            Áthelyezés
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Állapot módosítása
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onChangeStatus('draft')}>
                <Eye className="h-4 w-4 mr-2" />
                Vázlat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus('published')}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Publikált
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus('archived')}>
                <EyeOff className="h-4 w-4 mr-2" />
                Archivált
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Törlés
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="flex items-center gap-1"
        >
          <X className="h-4 w-4" />
          Mégse
        </Button>
      </div>
    </div>
  );
}
