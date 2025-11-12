import React from 'react';
import { Presentation } from '../../services/PresentationService';
import { ViewerPresentationCard } from './ViewerPresentationCard';
import { Presentation as PresentationIcon } from 'lucide-react';

interface PresentationGridProps {
  presentations: Presentation[];
}

export const PresentationGrid: React.FC<PresentationGridProps> = ({ presentations }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presentations.map((presentation) => (
          <ViewerPresentationCard key={presentation.id} presentation={presentation} />
        ))}
      </div>

      {presentations.length === 0 && (
        <div className="text-center py-12">
          <PresentationIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nincsenek elérhető tananyagok</h3>
          <p className="text-gray-500">Nézz vissza később a publikált tananyagokért</p>
        </div>
      )}
    </div>
  );
};
