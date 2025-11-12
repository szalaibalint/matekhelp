import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../../supabase/supabase';
import { toast } from '../ui/use-toast';
import { Save, X } from 'lucide-react';
import { UnifiedEditor } from './UnifiedEditor';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  level?: number;
  children?: Category[];
}

interface ContentEditorProps {
  selectedItem: { type: 'category' | 'presentation'; item: any } | null;
  isCreating: { type: 'category' | 'presentation' } | null;
  onClose: () => void;
  onSave: () => void;
  categories: Category[];
}

export function ContentEditor({ selectedItem, isCreating, onClose, onSave, categories }: ContentEditorProps) {
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('settings');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isCreating) {
      setFormData({
        name: '',
        title: '',
        description: '',
        category_id: null,
        status: 'draft',
        blocks: []
      });
      setActiveTab('settings');
    } else if (selectedItem) {
      loadItemData();
    }
  }, [selectedItem, isCreating]);

  const loadItemData = async () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'category') {
      setFormData(selectedItem.item);
    } else if (selectedItem.type === 'presentation') {
      const { data: presentation } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', selectedItem.item.id)
        .single();

      const { data: blocks } = await supabase
        .from('blocks')
        .select('*')
        .eq('presentation_id', selectedItem.item.id)
        .order('sort_order');

      setFormData({
        ...presentation,
        blocks: blocks || []
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isCreating?.type === 'category' || selectedItem?.type === 'category') {
        await handleSaveCategory();
      } else {
        await handleSavePresentation();
      }
      
      toast({
        title: 'Success',
        description: 'Changes saved successfully',
      });
      onSave();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    const data = {
      name: formData.name,
      description: formData.description,
      parent_id: formData.parent_id || null
    };

    if (isCreating) {
      const { error } = await supabase.from('categories').insert(data);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('categories')
        .update(data)
        .eq('id', selectedItem!.item.id);
      if (error) throw error;
    }
  };

  const handleSavePresentation = async () => {
    const presentationData = {
      title: formData.title,
      description: formData.description,
      category_id: formData.category_id || null,
      status: formData.status
    };

    let presentationId = selectedItem?.item.id;

    if (isCreating) {
      const { data, error } = await supabase
        .from('presentations')
        .insert(presentationData)
        .select()
        .single();
      if (error) throw error;
      presentationId = data.id;
    } else {
      const { error } = await supabase
        .from('presentations')
        .update(presentationData)
        .eq('id', presentationId);
      if (error) throw error;
    }

    // Save blocks
    if (formData.blocks && formData.blocks.length > 0) {
      // Delete existing blocks
      await supabase.from('blocks').delete().eq('presentation_id', presentationId);

      // Insert new blocks
      const blocksToInsert = formData.blocks.map((block: any, index: number) => ({
        presentation_id: presentationId,
        type: block.type,
        title: block.title,
        content: block.content,
        settings: block.settings,
        sort_order: index
      }));

      const { error } = await supabase.from('blocks').insert(blocksToInsert);
      if (error) throw error;
    }
  };

  const flattenCategories = (cats: Category[], level = 0): (Category & { level: number })[] => {
    let result: (Category & { level: number })[] = [];
    cats.forEach(cat => {
      result.push({ ...cat, level });
      if (cat.children) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  if (!selectedItem && !isCreating) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p>Válassz egyet a szerkesztéshez vagy hozz létre egy újat</p>
        </div>
      </div>
    );
  }

  const isCategory = isCreating?.type === 'category' || selectedItem?.type === 'category';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isCreating ? `Create ${isCreating.type}` : `Edit ${selectedItem?.type}`}
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Mégse
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isCategory ? (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter category name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter category description (optional)"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category</label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nincs altémakör hozzárendelve</SelectItem>
                  {flattenCategories(categories).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {'  '.repeat(cat.level)}
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Beállítások</TabsTrigger>
              <TabsTrigger value="content">Tartalom</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <Select
                  value={formData.category_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nincs témakör</SelectItem>
                    {flattenCategories(categories).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {'  '.repeat(cat.level)}
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select
                  value={formData.status || 'draft'}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Piszkozat</SelectItem>
                    <SelectItem value="published">Nyilvános</SelectItem>
                    <SelectItem value="archived">Archivált</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="content" className="flex-1 overflow-hidden">
              <UnifiedEditor
                blocks={formData.blocks || []}
                onChange={(blocks) => setFormData({ ...formData, blocks })}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}