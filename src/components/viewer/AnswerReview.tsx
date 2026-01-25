import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Slide } from '../../services/SlideService';
import { ChevronLeft, ChevronRight, Check, X, ArrowLeft } from 'lucide-react';

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

interface AnswerReviewProps {
  slides: Slide[];
  userAnswers: Record<number, any>;
  onBack: () => void;
}

// Helper to check if a slide has answerable content
const hasAnswerableContent = (slide: Slide): boolean => {
  switch (slide.type) {
    case 'multiple_choice':
      return slide.correct_answer !== null && slide.correct_answer !== undefined;
    case 'true_false':
      return (slide.content?.correctAnswer !== undefined || slide.correct_answer !== undefined);
    case 'ranking':
      return slide.content?.correctOrder && slide.content.correctOrder.length > 0;
    case 'matching':
      return slide.content?.pairs && slide.content.pairs.length > 0;
    case 'fill_in_blanks':
      return slide.content?.blanks && slide.content.blanks.length > 0;
    case 'text':
      // Check if text slide has input fields with correct answers
      if (Array.isArray(slide.content)) {
        let hasInputFields = false;
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.type === 'input-field' && node.correctAnswer) {
              hasInputFields = true;
              return;
            }
            if (node.children) traverse(node.children);
          }
        };
        traverse(slide.content);
        return hasInputFields;
      }
      return false;
    default:
      return false;
  }
};

// Get answerable slides
const getAnswerableSlides = (slides: Slide[]): { slide: Slide; originalIndex: number }[] => {
  return slides
    .map((slide, index) => ({ slide, originalIndex: index }))
    .filter(({ slide }) => hasAnswerableContent(slide));
};

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
      // Complex logic - simplified to just check if all blanks are filled correctly
      const content = slide.content.content || [];
      const blanks = slide.content.blanks || [];
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
      // Check input fields
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

// Render the answer review for a specific slide
const SlideAnswerReview: React.FC<{
  slide: Slide;
  userAnswer: any;
  slideNumber: number;
}> = ({ slide, userAnswer, slideNumber }) => {
  const isCorrect = isAnswerCorrect(slide, userAnswer);
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-gray-500">Dia {slideNumber}</span>
          <h2 className="text-2xl font-bold text-gray-800">{slide.title}</h2>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          <span className="font-medium">{isCorrect ? 'Helyes' : 'Hibás'}</span>
        </div>
      </div>

      {/* Slide type specific content */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        {slide.type === 'multiple_choice' && (
          <MultipleChoiceReview slide={slide} userAnswer={userAnswer} />
        )}
        {slide.type === 'true_false' && (
          <TrueFalseReview slide={slide} userAnswer={userAnswer} />
        )}
        {slide.type === 'ranking' && (
          <RankingReview slide={slide} userAnswer={userAnswer} />
        )}
        {slide.type === 'matching' && (
          <MatchingReview slide={slide} userAnswer={userAnswer} />
        )}
        {slide.type === 'fill_in_blanks' && (
          <FillInBlanksReview slide={slide} userAnswer={userAnswer} />
        )}
        {slide.type === 'text' && (
          <TextSlideReview slide={slide} userAnswer={userAnswer} />
        )}

        {/* Explanation section */}
        {slide.content.answerExplanation && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-500 text-lg">💡</span>
              <h4 className="font-medium text-gray-700">Magyarázat:</h4>
            </div>
            <p className="text-gray-600 whitespace-pre-wrap">
              <MathText text={slide.content.answerExplanation} />
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Multiple choice review
const MultipleChoiceReview: React.FC<{ slide: Slide; userAnswer: any }> = ({ slide, userAnswer }) => {
  const options = slide.content.options || [];
  const correctAnswers = slide.content.multipleCorrect 
    ? (Array.isArray(slide.correct_answer) ? slide.correct_answer : [])
    : [slide.correct_answer];
  const userAnswers = slide.content.multipleCorrect
    ? (Array.isArray(userAnswer) ? userAnswer : [])
    : [userAnswer];

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6 text-center">
        <MathText text={slide.content.question} />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option: any, index: number) => {
          const optionData = typeof option === 'string' ? { text: option } : option;
          const isCorrectOption = correctAnswers.includes(index);
          const wasSelected = userAnswers.includes(index);
          
          let bgColor = 'bg-gray-50';
          let borderColor = 'border-gray-200';
          let icon = null;
          
          if (isCorrectOption && wasSelected) {
            bgColor = 'bg-green-50';
            borderColor = 'border-green-500';
            icon = <Check className="h-5 w-5 text-green-600" />;
          } else if (isCorrectOption && !wasSelected) {
            bgColor = 'bg-green-50';
            borderColor = 'border-green-500 border-dashed';
            icon = <Check className="h-5 w-5 text-green-600" />;
          } else if (!isCorrectOption && wasSelected) {
            bgColor = 'bg-red-50';
            borderColor = 'border-red-500';
            icon = <X className="h-5 w-5 text-red-600" />;
          }
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${bgColor} ${borderColor} flex items-center justify-between`}
            >
              <span className="text-lg"><MathText text={optionData.text} /></span>
              <div className="flex items-center gap-2">
                {wasSelected && <span className="text-sm text-gray-500">(Te válaszod)</span>}
                {icon}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-700">
          Helyes válasz{correctAnswers.length > 1 ? 'ok' : ''}:{' '}
          {correctAnswers.map((i, idx) => (
            <span key={i}>
              {idx > 0 && ', '}
              <MathText text={options[i]?.text || options[i]} />
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

// True/False review
const TrueFalseReview: React.FC<{ slide: Slide; userAnswer: any }> = ({ slide, userAnswer }) => {
  const correctAnswer = slide.content.correctAnswer ?? slide.correct_answer;
  const normalizedCorrect = correctAnswer === true || correctAnswer === 'true';
  const normalizedUser = userAnswer === true || userAnswer === 'true';

  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-8">
        <MathText text={slide.content.statement} />
      </h3>
      <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
        <div className={`p-6 rounded-xl border-4 ${
          normalizedCorrect === true
            ? 'border-green-500 bg-green-50'
            : normalizedUser === true
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 bg-gray-50'
        }`}>
          <span className="text-2xl font-bold text-green-600">IGAZ</span>
          {normalizedCorrect === true && (
            <div className="mt-2 flex justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          )}
          {normalizedUser === true && !normalizedCorrect && (
            <div className="mt-2 text-sm text-gray-500">(Te válaszod)</div>
          )}
        </div>
        <div className={`p-6 rounded-xl border-4 ${
          normalizedCorrect === false
            ? 'border-green-500 bg-green-50'
            : normalizedUser === false
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 bg-gray-50'
        }`}>
          <span className="text-2xl font-bold text-red-600">HAMIS</span>
          {normalizedCorrect === false && (
            <div className="mt-2 flex justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          )}
          {normalizedUser === false && normalizedCorrect && (
            <div className="mt-2 text-sm text-gray-500">(Te válaszod)</div>
          )}
        </div>
      </div>
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-700">
          Helyes válasz: {normalizedCorrect ? 'IGAZ' : 'HAMIS'}
        </p>
      </div>
    </div>
  );
};

// Ranking review
const RankingReview: React.FC<{ slide: Slide; userAnswer: any }> = ({ slide, userAnswer }) => {
  const items = slide.content.items || [];
  const correctOrder = slide.content.correctOrder || [];
  const userOrder = userAnswer || [];

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6 text-center">
        <MathText text={slide.content.question} />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User's order */}
        <div>
          <h4 className="font-medium text-gray-700 mb-4">A te sorrendben:</h4>
          <div className="space-y-2">
            {userOrder.length > 0 ? userOrder.map((originalIndex: number, displayIndex: number) => {
              const itemData = items[originalIndex];
              const isCorrectPosition = correctOrder[displayIndex] === originalIndex;
              return (
                <div
                  key={displayIndex}
                  className={`p-3 rounded-lg border-2 flex items-center gap-3 ${
                    isCorrectPosition ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                  }`}
                >
                  <span className="font-bold text-gray-500 w-8">{displayIndex + 1}.</span>
                  <span><MathText text={typeof itemData === 'string' ? itemData : itemData?.text} /></span>
                  {isCorrectPosition ? <Check className="h-5 w-5 text-green-600 ml-auto" /> : <X className="h-5 w-5 text-red-600 ml-auto" />}
                </div>
              );
            }) : (
              <p className="text-gray-500 italic">Nem adtál választ</p>
            )}
          </div>
        </div>
        {/* Correct order */}
        <div>
          <h4 className="font-medium text-gray-700 mb-4">Helyes sorrend:</h4>
          <div className="space-y-2">
            {correctOrder.map((originalIndex: number, displayIndex: number) => {
              const itemData = items[originalIndex];
              return (
                <div
                  key={displayIndex}
                  className="p-3 rounded-lg border-2 border-green-500 bg-green-50 flex items-center gap-3"
                >
                  <span className="font-bold text-gray-500 w-8">{displayIndex + 1}.</span>
                  <span><MathText text={typeof itemData === 'string' ? itemData : itemData?.text} /></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Matching review
const MatchingReview: React.FC<{ slide: Slide; userAnswer: any }> = ({ slide, userAnswer }) => {
  const pairs = slide.content.pairs || [];
  const userMatches = userAnswer || {};

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6 text-center">
        <MathText text={slide.content.question} />
      </h3>
      <div className="space-y-4">
        {pairs.map((pair: any, index: number) => {
          const userMatchedIndex = Object.keys(userMatches).find(
            key => parseInt(key) === index
          );
          const userMatchedLeftIndex = userMatchedIndex !== undefined ? userMatches[parseInt(userMatchedIndex)] : null;
          const isCorrect = userMatchedLeftIndex === index;
          const userMatchedPair = userMatchedLeftIndex !== null ? pairs[userMatchedLeftIndex] : null;
          
          return (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-1 p-3 rounded-lg border-2 border-gray-200 bg-gray-50">
                <MathText text={pair.right} />
              </div>
              <div className="text-gray-400">→</div>
              <div className={`flex-1 p-3 rounded-lg border-2 ${
                isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span>
                    {userMatchedPair ? (
                      <MathText text={userMatchedPair.left} />
                    ) : (
                      <span className="text-gray-400 italic">Nincs párosítva</span>
                    )}
                  </span>
                  {isCorrect ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-red-600" />}
                </div>
              </div>
              {!isCorrect && (
                <div className="flex-1 p-3 rounded-lg border-2 border-green-500 border-dashed bg-green-50">
                  <MathText text={pair.left} />
                  <span className="text-sm text-green-600 ml-2">(helyes)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Fill in blanks review
const FillInBlanksReview: React.FC<{ slide: Slide; userAnswer: any }> = ({ slide, userAnswer }) => {
  const blanks = slide.content.blanks || [];
  const userMatches = userAnswer || {};
  
  // Create a map of blank IDs to their answers
  const blankMap = new Map<string, string>(blanks.map((b: any) => [b.id, b.answer]));
  
  // Find all drag-blank slots in content
  const slots: { slotId: string; blankId: string }[] = [];
  const traverse = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === 'drag-blank') {
        slots.push({ slotId: node.slotId || node.blankId, blankId: node.blankId });
      }
      if (node.children) traverse(node.children);
    }
  };
  traverse(slide.content.content || []);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6 text-center">Szöveg kiegészítés</h3>
      <div className="space-y-4">
        {slots.map((slot, index) => {
          const correctAnswer = blankMap.get(slot.blankId) || 'N/A';
          const userBlankId = userMatches[slot.slotId];
          const userAnswerText = userBlankId ? blankMap.get(userBlankId) : null;
          const isCorrect = userBlankId === slot.blankId;
          
          return (
            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Hely {index + 1}:</span>
              <div className={`flex-1 p-3 rounded-lg border-2 ${
                isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span>
                    {userAnswerText ? (
                      <MathText text={userAnswerText} />
                    ) : (
                      <span className="text-gray-400 italic">Üres</span>
                    )}
                  </span>
                  {isCorrect ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-red-600" />}
                </div>
              </div>
              {!isCorrect && (
                <div className="p-3 rounded-lg border-2 border-green-500 border-dashed bg-green-50">
                  <MathText text={correctAnswer} />
                  <span className="text-sm text-green-600 ml-2">(helyes)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Text slide with input fields review
const TextSlideReview: React.FC<{ slide: Slide; userAnswer: any }> = ({ slide, userAnswer }) => {
  if (!Array.isArray(slide.content)) return null;
  
  const inputFields: { index: number; correctAnswer: string; userAnswer: string | null }[] = [];
  let inputFieldIndex = 0;
  
  const traverse = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === 'input-field' && node.correctAnswer) {
        inputFields.push({
          index: inputFieldIndex,
          correctAnswer: node.correctAnswer,
          userAnswer: userAnswer?.[inputFieldIndex] || null
        });
        inputFieldIndex++;
      }
      if (node.children) traverse(node.children);
    }
  };
  traverse(slide.content);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6 text-center">Kitöltendő mezők</h3>
      <div className="space-y-4">
        {inputFields.map((field, index) => {
          const possibleAnswers = field.correctAnswer.split('|').map(a => a.trim().toLowerCase());
          const isCorrect = field.userAnswer && possibleAnswers.includes(field.userAnswer.toLowerCase().trim());
          
          return (
            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Mező {index + 1}:</span>
              <div className={`flex-1 p-3 rounded-lg border-2 ${
                isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span>
                    {field.userAnswer ? (
                      <span>{field.userAnswer}</span>
                    ) : (
                      <span className="text-gray-400 italic">Üres</span>
                    )}
                  </span>
                  {isCorrect ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-red-600" />}
                </div>
              </div>
              {!isCorrect && (
                <div className="p-3 rounded-lg border-2 border-green-500 border-dashed bg-green-50">
                  <span>{field.correctAnswer.split('|')[0]}</span>
                  {field.correctAnswer.includes('|') && (
                    <span className="text-sm text-gray-500 ml-2">
                      (vagy: {field.correctAnswer.split('|').slice(1).join(', ')})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AnswerReview: React.FC<AnswerReviewProps> = ({ slides, userAnswers, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const answerableSlides = getAnswerableSlides(slides);
  
  if (answerableSlides.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">
          Nincs megtekinthető válasz
        </h2>
        <p className="text-gray-500 mb-8">
          Ez a tananyag nem tartalmaz megválaszolható kérdéseket.
        </p>
        <Button onClick={onBack} className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza az eredményekhez
        </Button>
      </div>
    );
  }
  
  const currentItem = answerableSlides[currentIndex];
  const currentSlide = currentItem.slide;
  const originalSlideNumber = currentItem.originalIndex + 1;
  
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza az eredményekhez
          </Button>
          <h1 className="text-lg font-semibold text-gray-800">
            Válaszok áttekintése
          </h1>
          <div className="text-sm text-gray-500">
            {currentIndex + 1} / {answerableSlides.length} kérdés
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-gray-200/50">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
          style={{ width: `${((currentIndex + 1) / answerableSlides.length) * 100}%` }}
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <SlideAnswerReview
          slide={currentSlide}
          userAnswer={userAnswers[currentItem.originalIndex]}
          slideNumber={originalSlideNumber}
        />
      </div>
      
      {/* Navigation */}
      <div className="bg-white/80 backdrop-blur-md border-t border-gray-200/50 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="border-2"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Előző
          </Button>
          
          {/* Slide indicators */}
          <div className="flex gap-2">
            {answerableSlides.map((item, index) => {
              const isCorrect = isAnswerCorrect(item.slide, userAnswers[item.originalIndex]);
              return (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentIndex
                      ? 'scale-125 ring-2 ring-offset-2'
                      : ''
                  } ${
                    isCorrect ? 'bg-green-500 ring-green-300' : 'bg-red-500 ring-red-300'
                  }`}
                />
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.min(answerableSlides.length - 1, currentIndex + 1))}
            disabled={currentIndex === answerableSlides.length - 1}
            className="border-2"
          >
            Következő
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnswerReview;
