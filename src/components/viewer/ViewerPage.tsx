import { useState, useEffect } from 'react';
import { Category, loadCategories } from '../../services/CategoryService';
import { Presentation, loadPresentations } from '../../services/PresentationService';
import { getPopularPresentations, getRecentPresentations } from '../../services/PresentationTrackingService';
import { CategoryTree } from '../admin/CategoryTree';
import { PresentationGrid } from './PresentationGrid';
import { HorizontalScrollCarousel } from './HorizontalScrollCarousel';
import { BookOpen, TrendingUp, Clock } from 'lucide-react';

export default function ViewerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [popularPresentations, setPopularPresentations] = useState<Presentation[]>([]);
  const [recentPresentations, setRecentPresentations] = useState<Presentation[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchFeaturedPresentations();
  }, []);

  useEffect(() => {
    fetchPresentations();
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
    const categoryTree = await loadCategories();
    setCategories(categoryTree);
  };

  const fetchFeaturedPresentations = async () => {
    const [popular, recent] = await Promise.all([
      getPopularPresentations(10),
      getRecentPresentations(10)
    ]);
    setPopularPresentations(popular);
    setRecentPresentations(recent);
  };

  const fetchPresentations = async () => {
    const data = await loadPresentations(selectedCategoryId);
    setPresentations(data.filter(p => p.status === 'published'));
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MatekHelp
            </h1>
            <p className="text-sm text-gray-600">Interaktív matematika tananyagok</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <span>Témakörök</span>
            </h2>
          </div>

          <CategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onDeleteCategory={() => {}}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {!selectedCategoryId ? (
            // Landing page with featured content
            <div className="p-6 max-w-7xl mx-auto">
              {/* Popular Presentations */}
              {popularPresentations.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-6 w-6 text-orange-500" />
                    <h3 className="text-2xl font-bold text-gray-900">Népszerű tananyagok</h3>
                  </div>
                  <HorizontalScrollCarousel
                    title=""
                    presentations={popularPresentations}
                  />
                </div>
              )}

              {/* Recent Presentations */}
              {recentPresentations.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-6 w-6 text-blue-500" />
                    <h3 className="text-2xl font-bold text-gray-900">Legújabb tananyagok</h3>
                  </div>
                  <HorizontalScrollCarousel
                    title=""
                    presentations={recentPresentations}
                  />
                </div>
              )}

              {/* All Presentations */}
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Összes tananyag</h3>
                <PresentationGrid presentations={presentations} />
              </div>
            </div>
          ) : (
            // Category filtered view
            <div className="p-6">
              <PresentationGrid presentations={presentations} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
