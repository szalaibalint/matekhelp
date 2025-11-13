import React from 'react';
import { Presentation } from '../../services/PresentationService';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Play, Presentation as PresentationIcon, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ViewerPresentationCardProps {
  presentation: Presentation;
  bestScore?: number;
}

export const ViewerPresentationCard: React.FC<ViewerPresentationCardProps> = ({ presentation, bestScore }) => {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(presentation.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <PresentationIcon className="h-5 w-5 text-purple-600" />
            <Badge variant="default">Publikált</Badge>
          </div>
          {bestScore !== undefined && bestScore > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
              <Trophy className="h-4 w-4" />
              {bestScore}%
            </div>
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2 truncate">{presentation.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {presentation.description || 'Nincs leírás'}
        </p>
        <Button size="sm" variant="outline" className="w-full">
          <Play className="h-4 w-4 mr-2" />
          Tananyag megtekintése
        </Button>
      </CardContent>
    </Card>
  );
};
