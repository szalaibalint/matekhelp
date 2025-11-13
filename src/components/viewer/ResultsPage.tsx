import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

interface ResultsPageProps {
  correct: number;
  total: number;
  onRetry?: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ correct, total, onRetry }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center text-gray-900 p-4 md:p-8">
      <h1 className="text-3xl md:text-6xl font-bold mb-3 md:mb-4 text-center">Eredmények</h1>
      <div className="text-5xl md:text-8xl font-bold mb-6 md:mb-8">{correct} / {total}</div>
      <p className="text-lg md:text-2xl mb-6 md:mb-8 text-center px-4">
        {correct === total ? 'Tökéletes pontszám! 🎉' : correct >= total * 0.7 ? 'Szép munka! 👏' : 'Gyakorolj még! 💪'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <Button 
            size="lg" 
            variant="outline" 
            onClick={onRetry} 
            className="touch-manipulation w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Újra próbálom
          </Button>
        )}
        <Button 
          size="lg" 
          variant="secondary" 
          onClick={() => navigate('/')} 
          className="touch-manipulation w-full sm:w-auto"
        >
          Kilépés a tananyagból
        </Button>
      </div>
    </div>
  );
};
