import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { PlayCircle } from 'lucide-react';
import { UserProgress } from '../../services/UserProgressService';

interface InProgressCardProps {
  progress: UserProgress;
}

export function InProgressCard({ progress }: InProgressCardProps) {
  const navigate = useNavigate();
  const presentation = progress.presentation;

  if (!presentation) return null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow min-w-[250px] sm:min-w-[300px] group touch-manipulation"
      onClick={() => navigate(`/${presentation.id}`)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
          {presentation.thumbnail_url ? (
            <img 
              src={presentation.thumbnail_url} 
              alt={presentation.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl sm:text-6xl font-bold text-blue-200">
              {presentation.title[0]}
            </span>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <PlayCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
          </div>
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
            {progress.progress_percentage}%
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">{presentation.title}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 line-clamp-2">{presentation.description}</p>
          <div className="space-y-2">
            <Progress value={progress.progress_percentage} className="h-1.5 sm:h-2" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Dia: {progress.last_slide_index + 1} • {progress.progress_percentage}% kész
              </p>
              {progress.best_score_percentage !== undefined && progress.best_score_percentage > 0 && (
                <p className="text-xs font-semibold text-green-600 whitespace-nowrap">
                  Legjobb: {progress.best_score_percentage}%
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
