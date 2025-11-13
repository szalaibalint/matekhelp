import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

interface ResultsPageProps {
  correct: number;
  total: number;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ correct, total }) => {
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
    <div className="h-screen flex flex-col items-center justify-center text-gray-900 p-8">
      <h1 className="text-6xl font-bold mb-4">Eredmények</h1>
      <div className="text-8xl font-bold mb-8">{correct} / {total}</div>
      <p className="text-2xl mb-8">
        {correct === total ? 'Tökéletes pontszám! 🎉' : correct >= total * 0.7 ? 'Szép munka! 👏' : 'Gyakorolj még! 💪'}
      </p>
      <Button size="lg" variant="secondary" onClick={() => navigate('/')}>
        Kilépés a tananyagból
      </Button>
    </div>
  );
};
