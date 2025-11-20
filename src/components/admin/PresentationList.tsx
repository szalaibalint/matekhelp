import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Presentation as PresentationIcon, CheckSquare } from 'lucide-react';
import { supabase } from '../../../supabase/supabase';
import { Presentation, loadPresentations, duplicatePresentation, reorderPresentations } from '../../services/PresentationService';
import { Category } from '../../services/CategoryService';
import { PresentationCard } from './PresentationCard';
import { PresentationSettingsDialog } from './PresentationSettingsDialog';
import { DeletePresentationDialog } from './DeletePresentationDialog';
import { BulkOperationsToolbar } from './BulkOperationsToolbar';
import { BulkMoveCategoryDialog } from './BulkMoveCategoryDialog';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '../ui/use-toast';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemTypes = {
  PRESENTATION: 'presentation',
};

interface DraggablePresentationProps {
  presentation: Presentation;
  index: number;
  movePresentation: (fromIndex: number, toIndex: number) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEditSettings: (presentation: Presentation) => void;
  categoryName?: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  canReorder: boolean;
  hoverIndex: number | null;
  setHoverIndex: (index: number | null) => void;
}

const DraggablePresentation: React.FC<DraggablePresentationProps> = ({
  presentation,
  index,
  movePresentation,
  onSelect,
  onDelete,
  onDuplicate,
  onEditSettings,
  categoryName,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  canReorder,
  hoverIndex,
  setHoverIndex,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PRESENTATION,
    item: { id: presentation.id, index, categoryId: presentation.category_id },
    canDrag: canReorder && !isSelectionMode,
    end: (item, monitor) => {
      setHoverIndex(null);
      if (!monitor.didDrop()) {
        return;
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.PRESENTATION,
    canDrop: (item: { id: string; index: number; categoryId: string | null }) => {
      // Only allow dropping within the same category
      return canReorder && !isSelectionMode && item.categoryId === presentation.category_id;
    },
    hover: (item: { id: string; index: number }) => {
      if (item.index !== index) {
        setHoverIndex(index);
      }
    },
    drop: (item: { id: string; index: number }) => {
      if (item.index !== index) {
        movePresentation(item.index, index);
      }
      setHoverIndex(null);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const ref = (node: HTMLDivElement | null) => {
    if (canReorder && !isSelectionMode) {
      drag(drop(node));
    }
  };

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.3 : 1,
        cursor: canReorder && !isSelectionMode ? 'grab' : 'default',
      }}
      className={`relative transition-all duration-150 ${
        isOver && canDrop
          ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg'
          : ''
      } ${
        isDragging ? 'scale-95' : ''
      }`}
    >
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-blue-100 opacity-30 rounded-lg pointer-events-none z-10">
          <div className="absolute inset-0 border-2 border-dashed border-blue-500 rounded-lg" />
        </div>
      )}
      <PresentationCard
        presentation={presentation}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onEditSettings={onEditSettings}
        categoryName={categoryName}
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
      />
    </div>
  );
};

interface PresentationListProps {
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  categoryId: string | null;
  categories: Category[];
  searchQuery?: string;
}

export function PresentationList({ onSelect, onCreateNew, categoryId, categories, searchQuery = '' }: PresentationListProps) {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPresentation, setEditingPresentation] = useState<Presentation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { toast } = useToast();

  // Build category map for quick lookups
  useEffect(() => {
    const buildCategoryMap = (cats: Category[], map: Map<string, string>) => {
      cats.forEach(cat => {
        map.set(cat.id, cat.name);
        if (cat.children) {
          buildCategoryMap(cat.children, map);
        }
      });
    };
    
    const map = new Map<string, string>();
    buildCategoryMap(categories, map);
    setCategoryMap(map);
  }, [categories]);

  useEffect(() => {
    fetchPresentations();

    const subscription = supabase
      .channel('presentations-list-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentations' }, () => {
        fetchPresentations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [categoryId]);

  const fetchPresentations = async () => {
    setIsLoading(true);
    const data = await loadPresentations(categoryId, categories);
    setPresentations(data);
    setIsLoading(false);
  };

  const handleDuplicate = async (id: string) => {
    await duplicatePresentation(id);
    fetchPresentations();
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('presentations')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      toast({
        title: 'Sikeres törlés',
        description: `${idsToDelete.length} tananyag törölve.`,
      });

      clearSelection();
      fetchPresentations();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült törölni a tananyagokat.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkMove = async (targetCategoryId: string) => {
    try {
      const idsToMove = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('presentations')
        .update({ category_id: targetCategoryId })
        .in('id', idsToMove);

      if (error) throw error;

      toast({
        title: 'Sikeres áthelyezés',
        description: `${idsToMove.length} tananyag áthelyezve.`,
      });

      clearSelection();
      fetchPresentations();
    } catch (error) {
      console.error('Bulk move error:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült áthelyezni a tananyagokat.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkStatusChange = async (status: 'draft' | 'published' | 'archived') => {
    try {
      const idsToUpdate = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('presentations')
        .update({ status })
        .in('id', idsToUpdate);

      if (error) throw error;

      const statusNames = {
        draft: 'Vázlat',
        published: 'Publikált',
        archived: 'Archivált',
      };

      toast({
        title: 'Sikeres módosítás',
        description: `${idsToUpdate.length} tananyag állapota: ${statusNames[status]}.`,
      });

      clearSelection();
      fetchPresentations();
    } catch (error) {
      console.error('Bulk status change error:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült módosítani az állapotokat.',
        variant: 'destructive',
      });
    }
  };

  const movePresentation = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    // Only allow reordering within the same category
    const fromPresentation = filteredPresentations[fromIndex];
    const toPresentation = filteredPresentations[toIndex];
    
    if (fromPresentation.category_id !== toPresentation.category_id) {
      return; // Don't allow moving between different categories
    }
    
    const newPresentations = [...filteredPresentations];
    const [movedPresentation] = newPresentations.splice(fromIndex, 1);
    newPresentations.splice(toIndex, 0, movedPresentation);
    
    // Save the new order immediately
    await handleDragEnd(newPresentations);
  };

  const handleDragEnd = async (reorderedPresentations: Presentation[]) => {
    // Save the new order to the database
    try {
      const updates = reorderedPresentations.map((pres, index) => ({
        id: pres.id,
        display_order: index,
      }));

      // Batch update for better performance
      const promises = updates.map(update =>
        supabase
          .from('presentations')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      );

      await Promise.all(promises);

      toast({
        title: 'Sorrend mentve',
        description: 'A tananyagok sorrendje frissítve.',
      });
      
      // Refresh the list to show the new order
      await fetchPresentations();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült menteni a sorrendet.',
        variant: 'destructive',
      });
      fetchPresentations(); // Reload to reset order
    }
  };


  const findCategoryName = (cats: Category[], id: string | null): string | null => {
    if (!id) return null;
    for (const cat of cats) {
      if (cat.id === id) return cat.name;
      if (cat.children) {
        const found = findCategoryName(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const categoryName = findCategoryName(categories, categoryId);

  const filteredPresentations = presentations.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A to select all in selection mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && isSelectionMode) {
        e.preventDefault();
        const allIds = new Set(filteredPresentations.map(p => p.id));
        setSelectedIds(allIds);
      }
      // Escape to exit selection mode
      if (e.key === 'Escape' && isSelectionMode) {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, filteredPresentations]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50">
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {categoryName ? categoryName : 'Összes tananyag'}
              </h1>
              {isSelectionMode && filteredPresentations.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const allIds = new Set(filteredPresentations.map(p => p.id));
                    setSelectedIds(allIds);
                  }}
                >
                  Összes kijelölése
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={isSelectionMode ? "secondary" : "outline"} 
                onClick={toggleSelectionMode}
                size="lg"
              >
                <CheckSquare className="h-5 w-5 mr-2" />
                {isSelectionMode ? 'Kijelölés vége' : 'Kijelölés'}
              </Button>
              <Button onClick={onCreateNew} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Új Tananyag
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredPresentations.map((presentation, index) => (
                  <DraggablePresentation
                    key={presentation.id}
                    presentation={presentation}
                    index={index}
                    movePresentation={movePresentation}
                    onSelect={onSelect}
                    onDelete={setDeletingId}
                    onDuplicate={handleDuplicate}
                    onEditSettings={setEditingPresentation}
                    categoryName={categoryId ? categoryMap.get(presentation.category_id || '') : undefined}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(presentation.id)}
                    onToggleSelection={toggleSelection}
                    canReorder={categoryId !== null && !searchQuery}
                    hoverIndex={hoverIndex}
                    setHoverIndex={setHoverIndex}
                  />
                ))}
              </div>

              {filteredPresentations.length === 0 && (
                <div className="text-center py-12">
                  <PresentationIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Még nincsenek tananyagok</h3>
                  <p className="text-gray-500 mb-4">Hozd létre az első tananyagodat a kezdéshez.</p>
                  <Button onClick={onCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tananyag létrehozása
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <PresentationSettingsDialog
          presentation={editingPresentation}
          categories={categories}
          onClose={() => setEditingPresentation(null)}
          onSettingsSaved={fetchPresentations}
        />

        <DeletePresentationDialog
          deletingId={deletingId}
          onClose={() => setDeletingId(null)}
          onPresentationDeleted={fetchPresentations}
        />

        <BulkOperationsToolbar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onDelete={() => setShowBulkDeleteDialog(true)}
          onMoveToCategory={() => setShowBulkMoveDialog(true)}
          onChangeStatus={handleBulkStatusChange}
        />

        <BulkMoveCategoryDialog
          isOpen={showBulkMoveDialog}
          onClose={() => setShowBulkMoveDialog(false)}
          onConfirm={handleBulkMove}
          selectedCount={selectedIds.size}
          categories={categories}
        />

        <BulkDeleteDialog
          isOpen={showBulkDeleteDialog}
          onClose={() => setShowBulkDeleteDialog(false)}
          onConfirm={() => {
            handleBulkDelete();
            setShowBulkDeleteDialog(false);
          }}
          selectedCount={selectedIds.size}
        />
      </div>
    </DndProvider>
  );
}