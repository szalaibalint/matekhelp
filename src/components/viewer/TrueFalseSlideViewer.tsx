import React, { useState, useEffect } from 'react';
import { Slide } from '../../services/SlideService';
import { Check, X } from 'lucide-react';

// Lazy load KaTeX
const loadKatex = async () => {
  const katex = await import('katex');
  return katex.default;
};

const renderMathText = async (text: string): Promise<string> => {
  if (!text.includes('\\')) {
    return text;
  }
  
  try {
    const katex = await loadKatex();
    return katex.renderToString(text, {
      throwOnError: false,
      displayMode: false,
    });
  } catch (e) {
    return text;
  }
};

const MathText: React.FC<{ text: string }> = ({ text }) => {
  const [html, setHtml] = useState<string>(text);
  
  useEffect(() => {
    renderMathText(text).then(setHtml);
  }, [text]);
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

interface TrueFalseSlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: boolean) => void;
  textColor: string;
}

export const TrueFalseSlideViewer: React.FC<TrueFalseSlideViewerProps> = ({ 
  slide, 
  userAnswer, 
  onAnswer, 
  textColor 
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(
    userAnswer !== undefined ? userAnswer : null
  );

  const handleSelect = (answer: boolean) => {
    setSelectedAnswer(answer);
    onAnswer(answer);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2
        className="text-4xl font-bold mb-12 text-center leading-relaxed"
        style={{ color: slide.content.statementColor || textColor }}
      >
        <MathText text={slide.content.statement} />
      </h2>
      
      <div className="grid grid-cols-2 gap-8">
        {/* True Button */}
        <button
          onClick={() => handleSelect(true)}
          className={`p-8 rounded-xl border-4 transition-all transform hover:scale-105 ${
            selectedAnswer === true
              ? 'border-green-500 bg-green-50 shadow-xl'
              : 'border-gray-300 bg-white hover:border-green-300 hover:bg-green-50'
          }`}
        >
          <div className="flex flex-col items-center space-y-4">
            <Check className="h-16 w-16 text-green-600" />
            <span className="text-3xl font-bold text-green-600">IGAZ</span>
          </div>
        </button>

        {/* False Button */}
        <button
          onClick={() => handleSelect(false)}
          className={`p-8 rounded-xl border-4 transition-all transform hover:scale-105 ${
            selectedAnswer === false
              ? 'border-red-500 bg-red-50 shadow-xl'
              : 'border-gray-300 bg-white hover:border-red-300 hover:bg-red-50'
          }`}
        >
          <div className="flex flex-col items-center space-y-4">
            <X className="h-16 w-16 text-red-600" />
            <span className="text-3xl font-bold text-red-600">HAMIS</span>
          </div>
        </button>
      </div>

      {selectedAnswer !== null && (
        <div className="mt-8 text-center">
          <p className="text-lg text-gray-600">
            Válaszod: <span className={`font-bold ${selectedAnswer ? 'text-green-600' : 'text-red-600'}`}>
              {selectedAnswer ? 'IGAZ' : 'HAMIS'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
