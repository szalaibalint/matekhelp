import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Folder, 
  FolderPlus, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical,
  Presentation,
  Plus,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { supabase } from '../../../supabase/supabase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  children?: Category[];
}

interface PresentationItem {
  id: string;
  title: string;
  category_id: string | null;
  type: 'presentation';
  status: string;
}

interface FileExplorerProps {
  selectedItem: { type: 'category' | 'presentation'; item: any } | null;
  onItemSelect: (type: 'category' | 'presentation', item: any) => void;
  onCreateNew: (type: 'category' | 'presentation') => void;
  onRefresh?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function FileExplorer({ selectedItem, onItemSelect, onCreateNew, onRefresh, isCollapsed, onToggleCollapse }: FileExplorerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [presentations, setPresentations] = useState<{ [key: string]: PresentationItem[] }>({});
  const [uncategorizedPresentations, setUncategorizedPresentations] = useState<PresentationItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    
    // Subscribe to realtime changes
    const categoriesSubscription = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadData();
      })
      .subscribe();

    const presentationsSubscription = supabase
      .channel('presentations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentations' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      categoriesSubscription.unsubscribe();
      presentationsSubscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    await loadCategories();
    await loadUncategorizedPresentations();
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    const categoryTree = buildCategoryTree(data || []);
    setCategories(categoryTree);
  };

  const loadUncategorizedPresentations = async () => {
    const { data } = await supabase
      .from('presentations')
      .select('*')
      .is('category_id', null)
      .order('sort_order');

    const items: PresentationItem[] = (data || []).map(pres => ({ 
      ...pres, 
      type: 'presentation' as const 
    }));

    setUncategorizedPresentations(items);
  };

  const buildCategoryTree = (flatCategories: any[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    flatCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    flatCategories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children!.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  const loadPresentations = async (categoryId: string) => {
    try {
      const categoryIds = [categoryId];
      const collectSubcategoryIds = (cats: Category[]) => {
        cats.forEach(cat => {
          if (cat.parent_id === categoryId) {
            categoryIds.push(cat.id);
            if (cat.children) {
              collectSubcategoryIds(cat.children);
            }
          }
        });
      };
      collectSubcategoryIds(categories);

      const { data } = await supabase
        .from('presentations')
        .select('*')
        .in('category_id', categoryIds)
        .order('sort_order');

      const items: PresentationItem[] = (data || []).map(pres => ({ 
        ...pres, 
        type: 'presentation' as const 
      }));

      setPresentations(prev => ({ ...prev, [categoryId]: items }));
    } catch (error) {
      console.error('Error loading presentations:', error);
    }
  };

  const toggleCategory = async (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
      await loadPresentations(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedItem?.type === 'category' && selectedItem.item.id === category.id;
    const items = presentations[category.id] || [];
    const hasChildren = category.children && category.children.length > 0;
    const hasContent = items.length > 0;

    return (
      <div key={category.id} className="select-none">
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer group ${
            isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => onItemSelect('category', category)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 mr-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleCategory(category.id);
            }}
          >
            {hasChildren || hasContent ? (
              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3 opacity-30" />
            )}
          </Button>
          
          <Folder className="h-4 w-4 mr-2 text-blue-600" />
          
          <span className="flex-1 text-sm truncate">{category.name}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onCreateNew('category')}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Új Altémakör
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateNew('presentation')}>
                <Plus className="h-4 w-4 mr-2" />
                Új Tananyag
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div>
            {items.map(item => (
              <div
                key={item.id}
                className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer ${
                  selectedItem?.type === 'presentation' && selectedItem.item.id === item.id
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : ''
                }`}
                style={{ paddingLeft: `${24 + level * 16}px` }}
                onClick={() => onItemSelect('presentation', item)}
              >
                <Presentation className="h-4 w-4 mr-2 text-purple-600" />
                <span className="flex-1 text-sm truncate">{item.title}</span>
              </div>
            ))}
            {category.children?.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="h-full bg-white border-r border-gray-200 flex items-start p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Tartalom</h2>
          <div className="flex items-center space-x-1">
            <Button size="sm" onClick={() => onCreateNew('presentation')}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* Uncategorized presentations */}
        {uncategorizedPresentations.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 px-2 mb-2">Uncategorized</div>
            {uncategorizedPresentations.map(item => (
              <div
                key={item.id}
                className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer ${
                  selectedItem?.type === 'presentation' && selectedItem.item.id === item.id
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : ''
                }`}
                onClick={() => onItemSelect('presentation', item)}
              >
                <Presentation className="h-4 w-4 mr-2 text-purple-600" />
                <span className="flex-1 text-sm truncate">{item.title}</span>
              </div>
            ))}
          </div>
        )}
        
        {categories.map(category => renderCategory(category))}
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onCreateNew('category')}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          Új Témakör
        </Button>
      </div>
    </div>
  );
}