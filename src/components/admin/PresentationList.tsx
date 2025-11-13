import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Presentation as PresentationIcon } from 'lucide-react';
import { supabase } from '../../../supabase/supabase';
import { Presentation, loadPresentations, duplicatePresentation } from '../../services/PresentationService';
import { Category } from '../../services/CategoryService';
import { PresentationCard } from './PresentationCard';
import { PresentationSettingsDialog } from './PresentationSettingsDialog';
import { DeletePresentationDialog } from './DeletePresentationDialog';
import { Skeleton } from '../ui/skeleton';

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
    const data = await loadPresentations(categoryId);
    setPresentations(data);
    setIsLoading(false);
  };

  const handleDuplicate = async (id: string) => {
    await duplicatePresentation(id);
    fetchPresentations();
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {categoryName ? categoryName : 'Összes tananyag'}
          </h1>
          <Button onClick={onCreateNew} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Új Tananyag
          </Button>
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
              {filteredPresentations.map((presentation) => (
                <PresentationCard
                  key={presentation.id}
                  presentation={presentation}
                  onSelect={onSelect}
                  onDelete={setDeletingId}
                  onDuplicate={handleDuplicate}
                  onEditSettings={setEditingPresentation}
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
    </div>
  );
}