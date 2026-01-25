import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Slide } from '../../services/SlideService';
import { Check, X, ArrowRight, Lightbulb } from 'lucide-react';

// Lazy load KaTeX
const loadKatex = async () => {
  const katex = await import('katex');
  return katex.default;
};

const renderMathText = async (text: string): Promise<string> => {
  if (!text) return text || '';
  
  const hasLatex = text.includes('\\') || text.includes('$');
  if (!hasLatex) return text;
  
  try {
    const katex = await loadKatex();
    let html = text;
    
    html = html.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: true });
      } catch { return match; }
    });
    
    html = html.replace(/\\\[([^]*?)\\\]/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: true });
      } catch { return match; }
    });
    
    html = html.replace(/\\\(([^]*?)\\\)/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: false });
      } catch { return match; }
    });
    
    html = html.replace(/\$([^$]+)\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: false });
      } catch { return match; }
    });
    
    return html;
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

interface AnswerFeedbackProps {
  slide: Slide;
  userAnswer: any;
  onContinue: () => void;
}

// Check if user's answer is correct for a slide
const isAnswerCorrect = (slide: Slide, userAnswer: any): boolean => {
  switch (slide.type) {
    case 'multiple_choice': {
      if (slide.content.multipleCorrect) {
        const correctAnswers = Array.isArray(slide.correct_answer) ? slide.correct_answer : [];
        const userSelected = Array.isArray(userAnswer) ? userAnswer : [];
        return JSON.stringify(correctAnswers.sort()) === JSON.stringify(userSelected.sort());
      }
      return userAnswer === slide.correct_answer;
    }
    case 'true_false': {
      const correctAnswer = slide.content.correctAnswer ?? slide.correct_answer;
      const normalizedUserAnswer = userAnswer === true || userAnswer === 'true';
      const normalizedCorrectAnswer = correctAnswer === true || correctAnswer === 'true';
      return normalizedUserAnswer === normalizedCorrectAnswer;
    }
    case 'ranking': {
      return userAnswer && JSON.stringify(userAnswer) === JSON.stringify(slide.content.correctOrder);
    }
    case 'matching': {
      const pairs = slide.content.pairs || [];
      const userMatches = userAnswer || {};
      let allCorrect = true;
      pairs.forEach((_: any, index: number) => {
        if (userMatches[index] !== index) {
          allCorrect = false;
        }
      });
      return allCorrect;
    }
    case 'fill_in_blanks': {
      const content = slide.content.content || [];
      const userMatches = userAnswer || {};
      
      let allCorrect = true;
      const traverse = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.type === 'drag-blank') {
            const slotId = node.slotId || node.blankId;
            const expectedBlankId = node.blankId;
            const placedBlankId = userMatches[slotId];
            if (placedBlankId !== expectedBlankId) {
              allCorrect = false;
            }
          }
          if (node.children) traverse(node.children);
        }
      };
      traverse(content);
      return allCorrect;
    }
    case 'text': {
      if (Array.isArray(slide.content)) {
        let allCorrect = true;
        let inputFieldIndex = 0;
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.type === 'input-field' && node.correctAnswer) {
              const userFieldAnswer = userAnswer?.[inputFieldIndex];
              if (!userFieldAnswer) {
                allCorrect = false;
              } else {
                const possibleAnswers = node.correctAnswer.split('|').map((a: string) => a.trim().toLowerCase());
                if (!possibleAnswers.includes(userFieldAnswer.toLowerCase().trim())) {
                  allCorrect = false;
                }
              }
              inputFieldIndex++;
            }
            if (node.children) traverse(node.children);
          }
        };
        traverse(slide.content);
        return allCorrect;
      }
      return false;
    }
    default:
      return false;
  }
};

// Get the correct answer display for different slide types
const getCorrectAnswerDisplay = (slide: Slide): React.ReactNode => {
  switch (slide.type) {
    case 'multiple_choice': {
      const options = slide.content.options || [];
      if (slide.content.multipleCorrect) {
        const correctIndices = Array.isArray(slide.correct_answer) ? slide.correct_answer : [];
        return (
          <div className="space-y-1">
            {correctIndices.map((idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <MathText text={typeof options[idx] === 'string' ? options[idx] : options[idx]?.text || ''} />
              </div>
            ))}
          </div>
        );
      } else {
        const correctIdx = slide.correct_answer;
        const correctOption = options[correctIdx];
        return (
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <MathText text={typeof correctOption === 'string' ? correctOption : correctOption?.text || ''} />
          </div>
        );
      }
    }
    case 'true_false': {
      const correctAnswer = slide.content.correctAnswer ?? slide.correct_answer;
      const isTrue = correctAnswer === true || correctAnswer === 'true';
      return (
        <div className="flex items-center gap-2">
          {isTrue ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-600 font-medium">Igaz</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-500" />
              <span className="text-red-600 font-medium">Hamis</span>
            </>
          )}
        </div>
      );
    }
    case 'ranking': {
      const items = slide.content.items || [];
      const correctOrder = slide.content.correctOrder || [];
      return (
        <div className="space-y-1">
          {correctOrder.map((idx: number, position: number) => (
            <div key={position} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm font-medium flex items-center justify-center">
                {position + 1}
              </span>
              <MathText text={typeof items[idx] === 'string' ? items[idx] : items[idx]?.text || ''} />
            </div>
          ))}
        </div>
      );
    }
    case 'matching': {
      const pairs = slide.content.pairs || [];
      return (
        <div className="space-y-1">
          {pairs.map((pair: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <MathText text={pair.left} />
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <MathText text={pair.right} />
            </div>
          ))}
        </div>
      );
    }
    case 'fill_in_blanks': {
      const blanks = slide.content.blanks || [];
      return (
        <div className="space-y-1">
          {blanks.map((blank: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <span 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: blank.color || '#9333ea' }}
              />
              <span className="font-medium">{blank.answer}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'text': {
      // Extract input fields with correct answers
      if (Array.isArray(slide.content)) {
        const inputFields: { placeholder: string; correctAnswer: string }[] = [];
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.type === 'input-field' && node.correctAnswer) {
              inputFields.push({
                placeholder: node.placeholder || 'Válasz',
                correctAnswer: node.correctAnswer
              });
            }
            if (node.children) traverse(node.children);
          }
        };
        traverse(slide.content);
        
        if (inputFields.length > 0) {
          return (
            <div className="space-y-1">
              {inputFields.map((field, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-500">{field.placeholder}:</span>
                  <span className="font-medium">{field.correctAnswer.split('|')[0]}</span>
                </div>
              ))}
            </div>
          );
        }
      }
      return null;
    }
    default:
      return null;
  }
};

export const AnswerFeedback: React.FC<AnswerFeedbackProps> = ({ slide, userAnswer, onContinue }) => {
  const isCorrect = isAnswerCorrect(slide, userAnswer);
  const explanation = slide.content.answerExplanation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`px-6 py-4 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Helyes válasz! 🎉</h2>
                  <p className="text-white/80 text-sm">Szép munka!</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <X className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Sajnos nem jó 😔</h2>
                  <p className="text-white/80 text-sm">Nézd meg a helyes választ!</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Correct Answer Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Helyes válasz:</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              {getCorrectAnswerDisplay(slide)}
            </div>
          </div>

          {/* Explanation Section */}
          {explanation && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-500">Magyarázat:</h3>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                  <MathText text={explanation} />
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Button onClick={onContinue} className="w-full">
            Tovább
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnswerFeedback;
