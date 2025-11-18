import React, { useState } from 'react';
import { Category } from '../../services/CategoryService';
import { Button } from '../ui/button';
import { Folder, ChevronRight, ChevronDown, Trash2, Pencil } from 'lucide-react';

interface CategoryTreeProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onDeleteCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onDeleteCategory,
  onEditCategory,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategoryId === category.id;
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id} className="group">
        <div
          className={`flex items-center justify-between py-2.5 px-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border-l-4 border-blue-600 shadow-sm' : ''
          }`}
          style={{ 
            paddingLeft: `${12 + level * 20}px`,
            marginLeft: level > 0 ? '8px' : '0'
          }}
          onClick={() => onSelectCategory(category.id)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-2 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {!hasChildren && <div className="w-6 mr-2" />}
            <Folder className={`h-4 w-4 mr-2 flex-shrink-0 ${isSelected ? 'text-blue-700' : 'text-blue-500'}`} />
            <span className={`text-sm truncate ${isSelected ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>{category.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                onEditCategory(category);
              }}
            >
              <Pencil className="h-3 w-3 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(category);
              }}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="mt-1 border-l-2 border-gray-200 ml-3">
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div
        className={`flex items-center py-2.5 px-3 hover:bg-blue-50 rounded-lg cursor-pointer mb-3 transition-colors ${
          selectedCategoryId === null ? 'bg-blue-100 border-l-4 border-blue-600 shadow-sm' : ''
        }`}
        onClick={() => onSelectCategory(null)}
      >
        <span className={`text-sm ${selectedCategoryId === null ? 'font-semibold text-blue-900' : 'font-medium text-gray-700'}`}>
          Összes Tananyag
        </span>
      </div>
      <div className="space-y-1">
        {categories.map(category => renderCategory(category))}
      </div>
    </div>
  );
};
