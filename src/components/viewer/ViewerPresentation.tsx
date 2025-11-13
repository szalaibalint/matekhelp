import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { supabase } from '../../../supabase/supabase';
import { ArrowLeft } from 'lucide-react';
import { Slide, loadSlides } from '../../services/SlideService';
import { SlideViewer } from './SlideViewer';
import { ResultsPage } from './ResultsPage';
import { incrementViewCount } from '../../services/PresentationTrackingService';
import { UserProgressService } from '../../services/UserProgressService';
import { useViewerAuth } from '../../contexts/ViewerAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ViewerPresentation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useViewerAuth();
  const [presentation, setPresentation] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any>({});
  const [showResults, setShowResults] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<any | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const minSwipeDistance = 50;

  useEffect(() => {
    loadPresentationData();
  }, [id]);

  // Load saved progress
  useEffect(() => {
    const loadProgress = async () => {
      if (user?.id && id) {
        const progress = await UserProgressService.getProgress(id, user.id);
        if (progress && progress.last_slide_index > 0 && progress.progress_percentage < 100) {
          setSavedProgress(progress.last_slide_index);
          setSavedAnswers(progress.user_answers || {});
          setShowResumeDialog(true);
        }
      }
    };
    if (slides.length > 0) {
      loadProgress();
    }
  }, [slides, user, id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ': // Space bar
          e.preventDefault();
          if (!showResults && currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else if (!showResults && currentIndex === slides.length - 1) {
            setShowResults(true);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!showResults && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!showResults && currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!showResults && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          navigate('/');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, slides.length, showResults, navigate]);

  // Track progress when slide changes
  useEffect(() => {
    const saveProgressAsync = async () => {
      if (user?.id && id && slides.length > 0 && !showResults) {
        const result = await UserProgressService.saveProgress(
          id, 
          currentIndex, 
          slides.length, 
          user.id, 
          false, 
          userAnswers
        );
        
        if (!result.success) {
          setSaveError(result.error || 'Nem sikerült menteni a haladást');
          toast({
            title: 'Mentési hiba',
            description: result.error || 'Nem sikerült menteni a haladást',
            variant: 'destructive',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSaveError(null);
                  saveProgressAsync();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Újra
              </Button>
            ),
          });
        } else {
          setSaveError(null);
        }
      }
    };
    
    saveProgressAsync();
  }, [currentIndex, user, id, slides.length, showResults, userAnswers]);

  // Touch handlers for swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < slides.length - 1) {
      setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1));
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const loadPresentationData = async () => {
    const { data: presData } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', id)
      .single();

    if (presData) {
      setPresentation(presData);
      // Increment view count when presentation is loaded
      incrementViewCount(id!);
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
    // Mark as completed when showing results
    if (user?.id && id) {
      UserProgressService.markAsCompleted(id, slides.length, user.id, correct, total)
        .then(result => {
          if (!result.success) {
            toast({
              title: 'Hiba történt',
              description: result.error || 'Nem sikerült menteni az eredményt',
              variant: 'destructive',
            });
          }
        });
    }
    return <ResultsPage correct={correct} total={total} onRetry={() => {
      setShowResults(false);
      setCurrentIndex(0);
      setUserAnswers({});
    }} />;
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
        className="flex-1 overflow-y-auto flex items-start p-3 md:p-8"
        style={{ backgroundColor: slideBackgroundColor, color: slideTextColor, minHeight: 'calc(100vh - 80px)' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
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

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2 md:p-4 shadow-lg">
        {/* Mobile: Vertical Stack */}
        <div className="flex md:hidden flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {slides.length}
            </span>
            {user && (
              <span className="text-sm font-semibold text-blue-600">
                {Math.round(((currentIndex + 1) / slides.length) * 100)}%
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="flex-1 h-12 touch-manipulation"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
              disabled={currentIndex === 0}
              className="flex-1 h-12 touch-manipulation"
            >
              Előző
            </Button>
            {isLastSlide ? (
              <Button 
                onClick={() => setShowResults(true)} 
                className="flex-1 h-12 touch-manipulation"
              >
                Eredmények
              </Button>
            ) : (
              <Button 
                onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))} 
                className="flex-1 h-12 touch-manipulation"
              >
                Következő
              </Button>
            )}
          </div>
        </div>

        {/* Desktop: Horizontal Layout */}
        <div className="hidden md:flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kilépés a tananyagból
          </Button>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {slides.length}
            </span>
            {user && (
              <span className="text-sm font-semibold text-blue-600">
                {Math.round(((currentIndex + 1) / slides.length) * 100)}%
              </span>
            )}
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

      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folytatás</DialogTitle>
            <DialogDescription>
              Már elkezdted ezt a tananyagot. Szeretnéd folytatni, ahol abbahagytad?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowResumeDialog(false);
                setCurrentIndex(0);
                setUserAnswers({});
              }}
            >
              Kezdés elölről
            </Button>
            <Button
              onClick={() => {
                if (savedProgress !== null) {
                  setCurrentIndex(savedProgress);
                }
                if (savedAnswers !== null) {
                  setUserAnswers(savedAnswers);
                }
                setShowResumeDialog(false);
              }}
            >
              Folytatás ({savedProgress !== null ? savedProgress + 1 : 1}. dia)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
