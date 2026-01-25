import React, { useState } from 'react';
import { Category, moveCategoryUpDown } from '../../services/CategoryService';
import { Button } from '../ui/button';
import { Folder, ChevronRight, ChevronDown, Trash2, Pencil, GripVertical, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface CategoryTreeProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onDeleteCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onMoveCategory?: (categoryId: string, newParentId: string | null, insertBeforeId: string | null) => void;
  onCategoryMoved?: () => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onDeleteCategory,
  onEditCategory,
  onMoveCategory,
  onCategoryMoved,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'into' | null>(null);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const isDescendant = (parentCat: Category, childId: string): boolean => {
    if (parentCat.id === childId) return true;
    if (!parentCat.children) return false;
    return parentCat.children.some(child => isDescendant(child, childId));
  };

  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id);
    // Prevent default drag image flashing
    if (e.dataTransfer.setDragImage) {
      const dragImg = document.createElement('div');
      dragImg.style.opacity = '0';
      document.body.appendChild(dragImg);
      e.dataTransfer.setDragImage(dragImg, 0, 0);
      setTimeout(() => document.body.removeChild(dragImg), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, category: Category | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCategory) return;
    
    // Don't allow dropping on itself or its descendants
    if (category && isDescendant(draggedCategory, category.id)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    e.dataTransfer.dropEffect = 'move';
    
    // Calculate drop position based on mouse position
    if (category) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const threshold = height / 3;

      let newPosition: 'before' | 'after' | 'into';
      if (y < threshold) {
        newPosition = 'before';
      } else if (y > height - threshold) {
        newPosition = 'after';
      } else {
        newPosition = 'into';
      }

      const targetId = category.id;
      if (dragOverCategory !== targetId || dropPosition !== newPosition) {
        setDragOverCategory(targetId);
        setDropPosition(newPosition);
      }
    } else {
      // Root drop
      if (dragOverCategory !== 'root' || dropPosition !== 'into') {
        setDragOverCategory('root');
        setDropPosition('into');
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're actually leaving the element, not entering a child
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverCategory(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetCategory: Category | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCategory || !onMoveCategory) return;
    
    // Don't allow dropping on itself or its descendants
    if (targetCategory && isDescendant(draggedCategory, targetCategory.id)) {
      setDraggedCategory(null);
      setDragOverCategory(null);
      setDropPosition(null);
      return;
    }
    
    const getAllCategories = (cats: Category[]): Category[] => {
      let all: Category[] = [];
      cats.forEach(cat => {
        all.push(cat);
        if (cat.children) {
          all = all.concat(getAllCategories(cat.children));
        }
      });
      return all;
    };

    if (dropPosition === 'into') {
      // Move into the target category
      onMoveCategory(draggedCategory.id, targetCategory?.id || null, null);
    } else if (dropPosition === 'before') {
      // Insert before the target
      onMoveCategory(draggedCategory.id, targetCategory?.parent_id || null, targetCategory?.id || null);
    } else if (dropPosition === 'after' && targetCategory) {
      // Insert after the target - find next sibling
      const allCategories = getAllCategories(categories);
      const siblings = allCategories.filter(c => c.parent_id === targetCategory.parent_id);
      const targetIndex = siblings.findIndex(c => c.id === targetCategory.id);
      const nextSibling = siblings[targetIndex + 1];
      onMoveCategory(draggedCategory.id, targetCategory.parent_id || null, nextSibling?.id || null);
    }
    
    setDraggedCategory(null);
    setDragOverCategory(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
    setDragOverCategory(null);
    setDropPosition(null);
  };

  // Helper function to get siblings and check if a category can be moved
  const getSiblings = (category: Category): Category[] => {
    if (category.parent_id === null) {
      return categories;
    }
    const findParent = (cats: Category[]): Category | null => {
      for (const cat of cats) {
        if (cat.id === category.parent_id) return cat;
        if (cat.children) {
          const found = findParent(cat.children);
          if (found) return found;
        }
      }
      return null;
    };
    const parent = findParent(categories);
    return parent?.children || [];
  };

  const canMoveUp = (category: Category): boolean => {
    const siblings = getSiblings(category);
    const index = siblings.findIndex(c => c.id === category.id);
    return index > 0;
  };

  const canMoveDown = (category: Category): boolean => {
    const siblings = getSiblings(category);
    const index = siblings.findIndex(c => c.id === category.id);
    return index < siblings.length - 1 && index !== -1;
  };

  const handleMoveUpDown = async (category: Category, direction: 'up' | 'down') => {
    const success = await moveCategoryUpDown(category.id, category.parent_id, direction);
    if (success && onCategoryMoved) {
      onCategoryMoved();
    }
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategoryId === category.id;
    const hasChildren = category.children && category.children.length > 0;
    const isDragging = draggedCategory?.id === category.id;
    const isDragOver = dragOverCategory === category.id;

    return (
      <div key={category.id} className="group">
        {/* Drop indicator before */}
        {isDragOver && dropPosition === 'before' && (
          <div className="h-0.5 bg-blue-500 mx-3 mb-1" />
        )}
        
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, category)}
          onDragOver={(e) => handleDragOver(e, category)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, category)}
          onDragEnd={handleDragEnd}
          className={`flex items-center justify-between py-2.5 px-3 hover:bg-blue-50 rounded-lg transition-colors ${
            isSelected ? 'bg-blue-100 border-l-4 border-blue-600 shadow-sm' : ''
          } ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'} ${isDragOver && dropPosition === 'into' ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
          style={{ 
            paddingLeft: `${12 + level * 20}px`,
            marginLeft: level > 0 ? '8px' : '0'
          }}
          onClick={(e) => {
            if (!isDragging) {
              onSelectCategory(category.id);
            }
          }}
        >
          <div className="flex items-center flex-1 min-w-0 pointer-events-none">
            <GripVertical className="h-4 w-4 mr-1 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0 pointer-events-auto" />
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-2 hover:bg-blue-100 pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
                onDragStart={(e) => e.stopPropagation()}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {!hasChildren && <div className="w-6 mr-2" />}
            <Folder className={`h-4 w-4 mr-2 flex-shrink-0 ${isSelected ? 'text-blue-700' : 'text-blue-500'}`} />
            <span className={`text-sm truncate ${isSelected ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>{category.name}</span>
          </div>
          <div className="flex items-center gap-1 pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-50"
                  onClick={(e) => e.stopPropagation()}
                  onDragStart={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCategory(category);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Szerkesztés
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveUpDown(category, 'up');
                  }}
                  disabled={!canMoveUp(category)}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Mozgatás fel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveUpDown(category, 'down');
                  }}
                  disabled={!canMoveDown(category)}
                >
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Mozgatás le
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCategory(category);
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Törlés
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Drop indicator after */}
        {isDragOver && dropPosition === 'after' && (
          <div className="h-0.5 bg-blue-500 mx-3 mt-1" />
        )}
        
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
      <div 
        className={`space-y-1 ${dragOverCategory === 'root' ? 'ring-2 ring-blue-400 rounded-lg p-2 bg-blue-50' : ''}`}
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        {categories.map(category => renderCategory(category))}
      </div>
    </div>
  );
};
