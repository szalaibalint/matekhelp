import React, { useState, useEffect } from 'react';
import { Presentation, updatePresentationSettings } from '../../services/PresentationService';
import { Category } from '../../services/CategoryService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';

interface PresentationSettingsDialogProps {
  presentation: Presentation | null;
  categories: Category[];
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const PresentationSettingsDialog: React.FC<PresentationSettingsDialogProps> = ({
  presentation,
  categories,
  onClose,
  onSettingsSaved,
}) => {
  const [editingPresentation, setEditingPresentation] = useState<Presentation | null>(null);

  useEffect(() => {
    setEditingPresentation(presentation);
  }, [presentation]);

  const handleSave = async () => {
    if (!editingPresentation) return;
    await updatePresentationSettings(editingPresentation);
    onSettingsSaved();
    onClose();
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

  return (
    <Dialog open={!!presentation} onOpenChange={onClose}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Tananyag Beállítások</DialogTitle>
        </DialogHeader>
        {editingPresentation && (
          <div className="space-y-4">
            <div>
              <Label>Cím</Label>
              <Input
                value={editingPresentation.title}
                onChange={(e) => setEditingPresentation({ ...editingPresentation, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Leírás</Label>
              <Textarea
                value={editingPresentation.description}
                onChange={(e) => setEditingPresentation({ ...editingPresentation, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Státusz</Label>
              <Select
                value={editingPresentation.status}
                onValueChange={(value) => setEditingPresentation({ ...editingPresentation, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Piszkozat</SelectItem>
                  <SelectItem value="published">Nyilvános</SelectItem>
                  <SelectItem value="archived">Archiválva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Témakör</Label>
              <Select
                value={editingPresentation.category_id || 'none'}
                onValueChange={(value) => setEditingPresentation({
                  ...editingPresentation,
                  category_id: value === 'none' ? null : value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz témakört (opcionális)" />
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
            <Button onClick={handleSave}>
              Beállítások mentése
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
