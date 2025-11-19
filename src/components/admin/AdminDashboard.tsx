import { useState, useEffect } from 'react';
import { PresentationList } from './PresentationList';
import { PresentationEditor } from './PresentationEditor';
import { supabase } from '../../../supabase/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LogOut, Search } from 'lucide-react';
import { useAuth } from '../../../supabase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui/use-toast';
import { Category, loadCategories, reorderCategories } from '../../services/CategoryService';
import { CategoryTree } from './CategoryTree';
import { CategoryDialog } from './CategoryDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';

export default function AdminDashboard() {
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const categoryTree = await loadCategories();
    setCategories(categoryTree);
  };

  const handleCreateNew = async () => {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .insert({
          title: 'Névtelen tananyag',
          description: '',
          status: 'draft',
          category_id: selectedCategoryId
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSelectedPresentationId(data.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCategoryDeleted = () => {
    fetchCategories();
    if (selectedCategoryId === deletingCategory?.id) {
      setSelectedCategoryId(null);
    }
  };

  const handleEditComplete = () => {
    fetchCategories();
    setEditingCategory(null);
  };

  const handleMoveCategory = async (categoryId: string, newParentId: string | null, insertBeforeId: string | null) => {
    await reorderCategories(categoryId, newParentId, insertBeforeId);
    fetchCategories();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (selectedPresentationId) {
    return (
      <PresentationEditor
        presentationId={selectedPresentationId}
        onBack={() => setSelectedPresentationId(null)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tananyagok</h1>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Keresés a tananyagok között..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Kijelentkezés
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold mb-3">Témakörök</h2>
            <CategoryDialog 
              categories={categories} 
              onCategoryCreated={fetchCategories}
              editingCategory={editingCategory}
              onEditComplete={handleEditComplete}
            />
          </div>

          <CategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onDeleteCategory={setDeletingCategory}
            onEditCategory={setEditingCategory}
            onMoveCategory={handleMoveCategory}
          />
        </div>

        {/* Presentations List */}
        <div className="flex-1">
          <PresentationList
            onSelect={setSelectedPresentationId}
            onCreateNew={handleCreateNew}
            categoryId={selectedCategoryId}
            categories={categories}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      <DeleteCategoryDialog
        deletingCategory={deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
}