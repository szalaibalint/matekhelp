import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { supabase } from '../../../supabase/supabase';
import { ArrowLeft } from 'lucide-react';
import { Slide, loadSlides } from '../../services/SlideService';
import { SlideViewer } from './SlideViewer';
import { ResultsPage } from './ResultsPage';

export default function ViewerPresentation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadPresentationData();
  }, [id]);

  const loadPresentationData = async () => {
    const { data: presData } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', id)
      .single();

    if (presData) {
      setPresentation(presData);
    }

    const slidesData = await loadSlides(id!);
    setSlides(slidesData);
  };

  const handleAnswer = (answer: any, slideIndex: number, elementIndex?: number) => {
    const newAnswers = { ...userAnswers };
    if (elementIndex !== undefined) {
      if (!newAnswers[slideIndex]) {
        newAnswers[slideIndex] = {};
      }
      newAnswers[slideIndex][elementIndex] = answer;
    } else {
      newAnswers[slideIndex] = answer;
    }
    setUserAnswers(newAnswers);
  };

  const calculateScore = () => {
    let correct = 0;
    let total = 0;

    slides.forEach((slide: Slide, index: number) => {
      if (slide.type === 'multiple_choice' && slide.correct_answer !== null) {
        total += slide.points;
        const userAnswer = userAnswers[index];

        if (slide.content.multipleCorrect) {
          const correctAnswers = Array.isArray(slide.correct_answer) ? slide.correct_answer : [];
          const userSelected = Array.isArray(userAnswer) ? userAnswer : [];

          if (JSON.stringify(correctAnswers.sort()) === JSON.stringify(userSelected.sort())) {
            correct += slide.points;
          }
        } else {
          if (userAnswer === slide.correct_answer) {
            correct += slide.points;
          }
        }
      }

      if (slide.type === 'ranking' && slide.content.correctOrder) {
        total += slide.points;
        const userOrder = userAnswers[index];

        if (userOrder && JSON.stringify(userOrder) === JSON.stringify(slide.content.correctOrder)) {
          correct += slide.points;
        }
      }

      if (slide.type === 'matching' && slide.content.pairs) {
        const pairs = slide.content.pairs;
        const pointsPerPair = slide.content.pointsPerPair || 1;
        total += pairs.length * pointsPerPair;
        
        const userMatches = userAnswers[index] || {};
        
        // Check each match: userMatches is { rightIndex: leftOriginalIndex }
        Object.keys(userMatches).forEach((rightIndexStr) => {
          const rightIndex = parseInt(rightIndexStr);
          const leftOriginalIndex = userMatches[rightIndex];
          
          // Correct if the left item's original index matches the right item's index
          if (leftOriginalIndex === rightIndex) {
            correct += pointsPerPair;
          }
        });
      }

      if (slide.type === 'true_false') {
        total += slide.points;
        const userAnswer = userAnswers[index];
        const correctAnswer = slide.content.correctAnswer ?? slide.correct_answer;
        
        // Handle both boolean and string comparisons
        const normalizedUserAnswer = userAnswer === true || userAnswer === 'true';
        const normalizedCorrectAnswer = correctAnswer === true || correctAnswer === 'true';
        
        if (normalizedUserAnswer === normalizedCorrectAnswer) {
          correct += slide.points;
        }
      }

      if (slide.type === 'fill_in_blanks') {
        const content = slide.content.content || [];
        const userMatches = userAnswers[index] || {};
        let totalSlots = 0;
        let correctSlots = 0;
        
        // Traverse content to find all drag-blank slots
        const traverseContent = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.type === 'drag-blank') {
              totalSlots++;
              const slotId = node.slotId || node.blankId; // Fallback for old data
              const expectedBlankId = node.blankId; // The correct answer for this slot
              const placedBlankId = userMatches[slotId]; // What the user placed
              
              if (placedBlankId === expectedBlankId) {
                correctSlots++;
              }
            }
            if (node.children) {
              traverseContent(node.children);
            }
          }
        };
        
        traverseContent(content);
        
        const pointsPerSlot = totalSlots > 0 ? Math.floor(slide.points / totalSlots) : 0;
        total += slide.points;
        correct += correctSlots * pointsPerSlot;
      }

      if (slide.type === 'text' && Array.isArray(slide.content)) {
        let inputFieldIndex = 0;
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.type === 'input-field') {
              const points = Number(node.points) || 0;
              total += points;
              const userAnswer = userAnswers[index]?.[inputFieldIndex];
              if (userAnswer && node.correctAnswer) {
                // Check if we have multiple answer options (|) and/or multiple fields (\)
                const hasMultipleOptions = node.correctAnswer.includes('|');
                const hasMultipleFields = node.correctAnswer.includes('\\');
                
                if (hasMultipleOptions && hasMultipleFields) {
                  // Format: "2|two\1|one\3|three"
                  // Split by | to get answer options, then split each by \ to get field values
                  const answerOptions = node.correctAnswer.split('|');
                  const userFields = userAnswer.split('\\').map((f: string) => f.trim().toLowerCase());
                  
                  // Check if user's answers match any of the answer option sets
                  let isCorrect = false;
                  for (let optionIndex = 0; optionIndex < answerOptions.length; optionIndex++) {
                    const expectedFields = answerOptions[optionIndex].split('\\').map((f: string) => f.trim().toLowerCase());
                    
                    // Check if this option has the same number of fields
                    if (expectedFields.length === userFields.length) {
                      // Check if all fields match
                      const allMatch = expectedFields.every((expected: string, fieldIndex: number) => {
                        return expected === userFields[fieldIndex];
                      });
                      
                      if (allMatch) {
                        isCorrect = true;
                        break;
                      }
                    }
                  }
                  
                  if (isCorrect) {
                    correct += points;
                  }
                } else if (hasMultipleFields) {
                  // Format: "2\1\3" (single correct answer with multiple fields)
                  const expectedFields = node.correctAnswer.split('\\').map((f: string) => f.trim().toLowerCase());
                  const userFields = userAnswer.split('\\').map((f: string) => f.trim().toLowerCase());
                  
                  const allMatch = expectedFields.length === userFields.length && 
                                   expectedFields.every((expected: string, idx: number) => expected === userFields[idx]);
                  
                  if (allMatch) {
                    correct += points;
                  }
                } else if (hasMultipleOptions) {
                  // Format: "sin|sine|sinus" (multiple correct answers for single field)
                  const possibleAnswers = node.correctAnswer.split('|').map((a: string) => a.trim().toLowerCase());
                  const userAnswerLower = userAnswer.toLowerCase().trim();
                  if (possibleAnswers.includes(userAnswerLower)) {
                    correct += points;
                  }
                } else {
                  // Simple single field, single answer
                  if (userAnswer.toLowerCase().trim() === node.correctAnswer.toLowerCase().trim()) {
                    correct += points;
                  }
                }
              }
              inputFieldIndex++;
            }
            if (node.children) {
              traverse(node.children);
            }
          }
        };
        traverse(slide.content);
      }
    });

    return { correct, total };
  };

  if (!presentation || slides.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Tananyag betöltése...</h2>
        </div>
      </div>
    );
  }

  if (showResults) {
    const { correct, total } = calculateScore();
    return <ResultsPage correct={correct} total={total} />;
  }

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const slideBackgroundColor = currentSlide?.backgroundColor || presentation.theme?.background || '#ffffff';
  const slideTextColor = currentSlide?.textColor || presentation.theme?.textColor || '#000000';

  return (
    <div className="h-screen flex flex-col">
      <div className="h-2 bg-gray-200">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
        />
      </div>

      <div
        className="flex-1 overflow-y-auto flex items-center p-8"
        style={{ backgroundColor: slideBackgroundColor, color: slideTextColor, minHeight: 'calc(100vh - 80px)' }}
      >
        <div className="w-full">
          <SlideViewer
            slide={currentSlide}
            userAnswer={userAnswers[currentIndex]}
            onAnswer={(answer, slideIndex, elementIndex) => handleAnswer(answer, slideIndex, elementIndex)}
            textColor={slideTextColor}
            slideIndex={currentIndex}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 flex items-center justify-between shadow-lg">
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kilépés a tananyagból
        </Button>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
            Előző
          </Button>
          {isLastSlide ? (
            <Button onClick={() => setShowResults(true)}>
              Eredmények megjelenítése
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}>
              Következő
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
