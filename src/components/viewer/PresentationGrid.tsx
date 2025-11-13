import React, { useState, useEffect } from 'react';
import { Presentation } from '../../services/PresentationService';
import { ViewerPresentationCard } from './ViewerPresentationCard';
import { Presentation as PresentationIcon } from 'lucide-react';
import { UserProgressService, UserProgress } from '../../services/UserProgressService';
import { useViewerAuth } from '../../contexts/ViewerAuthContext';

interface PresentationGridProps {
  presentations: Presentation[];
}

export const PresentationGrid: React.FC<PresentationGridProps> = ({ presentations }) => {
  const { user } = useViewerAuth();
  const [progressMap, setProgressMap] = useState<Map<string, UserProgress>>(new Map());

  useEffect(() => {
    const loadProgress = async () => {
      if (user?.id && presentations.length > 0) {
        const ids = presentations.map(p => p.id);
        const progress = await UserProgressService.getProgressForPresentations(ids, user.id);
        setProgressMap(progress);
      }
    };
    loadProgress();
  }, [user, presentations]);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {presentations.map((presentation) => {
          const progress = progressMap.get(presentation.id);
          return (
            <ViewerPresentationCard 
              key={presentation.id} 
              presentation={presentation}
              bestScore={progress?.best_score_percentage}
            />
          );
        })}
      </div>

      {presentations.length === 0 && (
        <div className="text-center py-8 md:py-12">
          <PresentationIcon className="h-12 w-12 md:h-16 md:w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Nincsenek elérhető tananyagok</h3>
          <p className="text-gray-500">Nézz vissza később a publikált tananyagokért</p>
        </div>
      )}
    </div>
  );
};
