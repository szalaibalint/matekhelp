import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye } from 'lucide-react';
import { Slide } from '../../services/SlideService';
import { AnswerReview } from './AnswerReview';

interface ResultsPageProps {
  correct: number;
  total: number;
  onRetry?: () => void;
  showAnswersAfterCompletion?: boolean;
  showPoints?: boolean;
  slides?: Slide[];
  userAnswers?: Record<number, any>;
}

// Get motivational message based on performance percentage
const getMotivationalMessage = (percentage: number): { emoji: string; title: string; subtitle: string } => {
  if (percentage === 100) {
    return {
      emoji: '🏆',
      title: 'Tökéletes!',
      subtitle: 'Minden válaszod helyes volt! Fantasztikus teljesítmény!'
    };
  } else if (percentage >= 90) {
    return {
      emoji: '🌟',
      title: 'Kiváló!',
      subtitle: 'Szinte minden válaszod helyes volt! Nagyszerű munka!'
    };
  } else if (percentage >= 75) {
    return {
      emoji: '💪',
      title: 'Nagyon jó!',
      subtitle: 'Remek teljesítmény! Csak így tovább!'
    };
  } else if (percentage >= 60) {
    return {
      emoji: '👍',
      title: 'Jó munka!',
      subtitle: 'Szép eredmény! Egy kis gyakorlással még jobb leszel!'
    };
  } else if (percentage >= 40) {
    return {
      emoji: '📚',
      title: 'Jó kezdet!',
      subtitle: 'Ne add fel! Gyakorolj még egy kicsit és menni fog!'
    };
  } else if (percentage >= 20) {
    return {
      emoji: '🎯',
      title: 'Próbáld újra!',
      subtitle: 'Minden mester gyakorlással kezdte. Folytasd a tanulást!'
    };
  } else {
    return {
      emoji: '🌱',
      title: 'Minden kezdet nehéz!',
      subtitle: 'Ne csüggedj! Nézd át újra az anyagot és próbáld meg ismét!'
    };
  }
};

export const ResultsPage: React.FC<ResultsPageProps> = ({ 
  correct, 
  total, 
  onRetry,
  showAnswersAfterCompletion = false,
  showPoints = true,
  slides = [],
  userAnswers = {}
}) => {
  const navigate = useNavigate();
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const motivationalMessage = getMotivationalMessage(percentage);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate away if we're in answer review mode
      if (showAnswerReview) return;
      
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showAnswerReview]);

  // Show answer review screen if requested
  if (showAnswerReview) {
    return (
      <AnswerReview 
        slides={slides} 
        userAnswers={userAnswers} 
        onBack={() => setShowAnswerReview(false)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center text-gray-900 p-4 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {showPoints ? (
        // Show points mode
        <>
          <h1 className="text-3xl md:text-6xl font-bold mb-3 md:mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Eredmények</h1>
          <div className="text-5xl md:text-8xl font-bold mb-6 md:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">{correct} / {total}</div>
        </>
      ) : (
        // Show motivational message mode
        <>
          <div className="text-7xl md:text-9xl mb-4 md:mb-6 animate-bounce">{motivationalMessage.emoji}</div>
          <h1 className="text-3xl md:text-6xl font-bold mb-3 md:mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            {motivationalMessage.title}
          </h1>
          <p className="text-lg md:text-2xl text-gray-600 text-center max-w-md mb-6 md:mb-8">
            {motivationalMessage.subtitle}
          </p>
        </>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        {showAnswersAfterCompletion && slides.length > 0 && (
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setShowAnswerReview(true)} 
            className="touch-manipulation w-full sm:w-auto border-2 hover:bg-green-50 hover:border-green-400 transition-all shadow-md hover:shadow-lg"
          >
            <Eye className="h-4 w-4 mr-2" />
            Válaszok megtekintése
          </Button>
        )}
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
