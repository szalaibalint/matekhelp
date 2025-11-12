import React from 'react';
import { Presentation } from '../../services/PresentationService';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { MoreVertical, Trash2, Copy, Eye, Settings, Presentation as PresentationIcon } from 'lucide-react';

interface PresentationCardProps {
  presentation: Presentation;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEditSettings: (presentation: Presentation) => void;
}

export const PresentationCard: React.FC<PresentationCardProps> = ({
  presentation,
  onSelect,
  onDelete,
  onDuplicate,
  onEditSettings,
}) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(presentation.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <PresentationIcon className="h-5 w-5 text-purple-600" />
            <Badge variant={presentation.status === 'published' ? 'default' : 'secondary'}>
              {presentation.status === 'published' ? 'Nyilvános' : presentation.status === 'draft' ? 'Piszkozat' : 'Archivált'}
            </Badge>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onSelect(presentation.id);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Megnyitás
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEditSettings(presentation);
              }}>
                <Settings className="h-4 w-4 mr-2" />
                Beállítások
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onDuplicate(presentation.id);
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplikálás
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(presentation.id);
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Törlés
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h3 className="text-lg font-semibold mb-2 truncate">{presentation.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {presentation.description || 'Nincs leírás'}
        </p>
        <p className="text-xs text-gray-400">
          Frissítve: {new Date(presentation.updated_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};
