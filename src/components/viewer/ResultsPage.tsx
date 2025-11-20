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
    <div className="h-screen flex flex-col items-center justify-center text-gray-900 p-4 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <h1 className="text-3xl md:text-6xl font-bold mb-3 md:mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Eredmények</h1>
      <div className="text-5xl md:text-8xl font-bold mb-6 md:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">{correct} / {total}</div>
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <Button 
            size="lg" 
            variant="outline" 
            onClick={onRetry} 
            className="touch-manipulation w-full sm:w-auto border-2 hover:bg-blue-50 hover:border-blue-400 transition-all shadow-md hover:shadow-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Újra próbálom
          </Button>
        )}
        <Button 
          size="lg" 
          onClick={() => navigate('/')} 
          className="touch-manipulation w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
        >
          Kilépés a tananyagból
        </Button>
      </div>
    </div>
  );
};
