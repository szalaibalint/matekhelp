import { useState, useEffect } from 'react';
import { Category, loadCategories } from '../../services/CategoryService';
import { Presentation, loadPresentations } from '../../services/PresentationService';
import { CategoryTree } from '../admin/CategoryTree';
import { PresentationGrid } from './PresentationGrid';

export default function ViewerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPresentations();
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
    const categoryTree = await loadCategories();
    setCategories(categoryTree);
  };

  const fetchPresentations = async () => {
    const data = await loadPresentations(selectedCategoryId);
    setPresentations(data.filter(p => p.status === 'published'));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Tananyag Nézegető</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold mb-3">Témakörök</h2>
          </div>

          <CategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onDeleteCategory={() => {}}
          />
        </div>

        {/* Presentations Grid */}
        <PresentationGrid presentations={presentations} />
      </div>
    </div>
  );
}
