import React from 'react';
import { Category } from '../../services/CategoryService';
import { Folder, ChevronRight } from 'lucide-react';

interface SubcategoryGridProps {
  subcategories: Category[];
  onSelectCategory: (id: string) => void;
}

export const SubcategoryGrid: React.FC<SubcategoryGridProps> = ({ subcategories, onSelectCategory }) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Témakörök</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {subcategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className="group relative bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                <Folder className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {category.description}
                </p>
              )}
              {category.children && category.children.length > 0 && (
                <div className="flex items-center text-xs text-gray-400 mt-2">
                  <span>{category.children.length} altémakör</span>
                </div>
              )}
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <ChevronRight className="h-5 w-5 text-white" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
