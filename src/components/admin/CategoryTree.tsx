import React, { useState } from 'react';
import { Category } from '../../services/CategoryService';
import { Button } from '../ui/button';
import { Folder, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';

interface CategoryTreeProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onDeleteCategory: (category: Category) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onDeleteCategory,
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
          className={`flex items-center justify-between py-2 px-3 hover:bg-gray-100 rounded cursor-pointer ${
            isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => onSelectCategory(category.id)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            )}
            <Folder className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
            <span className="text-sm truncate">{category.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCategory(category);
            }}
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div
        className={`flex items-center py-2 px-3 hover:bg-gray-100 rounded cursor-pointer mb-2 ${
          selectedCategoryId === null ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        onClick={() => onSelectCategory(null)}
      >
        <span className="text-sm font-medium">Összes Tananyag</span>
      </div>
      {categories.map(category => renderCategory(category))}
    </div>
  );
};
