import React, { useState } from 'react';
import { Category } from '../../services/CategoryService';
import { Button } from '../ui/button';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';

interface ViewerCategoryTreeProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  expandedCategories?: Set<string>;
  onExpandedChange?: (expanded: Set<string>) => void;
}

export const ViewerCategoryTree: React.FC<ViewerCategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  expandedCategories: externalExpanded,
  onExpandedChange,
}) => {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set());
  const expandedCategories = externalExpanded || internalExpanded;
  const setExpandedCategories = onExpandedChange || setInternalExpanded;

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategoryId === category.id;
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center py-2.5 px-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors ${
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
            {category.image_url ? (
              <img 
                src={category.image_url} 
                alt={category.name}
                loading="lazy"
                className="h-4 w-4 mr-2 flex-shrink-0 rounded object-cover"
              />
            ) : (
              <Folder className={`h-4 w-4 mr-2 flex-shrink-0 ${isSelected ? 'text-blue-700' : 'text-blue-500'}`} />
            )}
            <span className={`text-sm truncate ${isSelected ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>
              {category.name}
            </span>
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
