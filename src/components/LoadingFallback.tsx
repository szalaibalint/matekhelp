import { BookOpen } from 'lucide-react';

export const LoadingFallback = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Betöltés...</h2>
        <p className="text-gray-600">Kérlek várj egy pillanatot</p>
      </div>
    </div>
  );
};
