import React, { useState, useEffect } from 'react';
import { Slide } from '../../services/SlideService';

// Lazy load KaTeX
const loadKatex = async () => {
  const katex = await import('katex');
  return katex.default;
};

const renderMathText = async (text: string): Promise<string> => {
  // Check if text contains LaTeX (starts with backslash)
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

interface MultipleChoiceSlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: any) => void;
  textColor: string;
}

export const MultipleChoiceSlideViewer: React.FC<MultipleChoiceSlideViewerProps> = ({ slide, userAnswer, onAnswer, textColor }) => {
  return (
    <div className="w-full max-w-4xl">
      <h2
        className="text-4xl font-bold mb-8 text-center"
        style={{ color: slide.content.questionColor || textColor }}
      >
        <MathText text={slide.content.question} />
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {(slide.content.options || []).map((option: any, index: number) => {
          const optionData = typeof option === 'string' ? { text: option, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' } : option;
          const isSelected = slide.content.multipleCorrect
            ? Array.isArray(userAnswer) && userAnswer.includes(index)
            : userAnswer === index;

          return (
            <button
              key={index}
              onClick={() => {
                if (slide.content.multipleCorrect) {
                  const current = Array.isArray(userAnswer) ? userAnswer : [];
                  const newAnswer = current.includes(index)
                    ? current.filter((i: number) => i !== index)
                    : [...current, index];
                  onAnswer(newAnswer);
                } else {
                  onAnswer(index);
                }
              }}
              className="p-8 rounded-lg border-4 transition-all text-xl font-medium"
              style={{
                color: optionData.textColor,
                backgroundColor: isSelected ? '#dbeafe' : optionData.bgColor,
                borderColor: isSelected ? '#3b82f6' : optionData.borderColor
              }}
            >
              <MathText text={optionData.text} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
