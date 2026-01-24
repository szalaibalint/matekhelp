import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { supabase } from '../../../supabase/supabase';
import { ArrowLeft, Maximize, Minimize, Grid, X, BookOpen, RotateCw } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [furthestSlideReached, setFurthestSlideReached] = useState(0);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const { toast } = useToast();

  // Detect mobile portrait orientation
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768 || window.innerHeight <= 500;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const minSwipeDistance = 50;

  // Fullscreen functions
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            navigate('/');
          }
          break;
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, slides.length, showResults, navigate]);

  // Track progress when slide changes
  useEffect(() => {
    // Update furthest slide reached
    if (currentIndex > furthestSlideReached) {
      setFurthestSlideReached(currentIndex);
    }
    
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
    <div className="h-screen flex flex-col relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Mobile Portrait Overlay - Ask user to rotate device */}
      {isMobilePortrait && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex flex-col items-center justify-center p-8 text-white">
          <div className="animate-bounce mb-8">
            <RotateCw className="h-20 w-20 text-white/90" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">
            Fordítsd el a készüléked!
          </h2>
          <p className="text-center text-white/80 text-lg max-w-xs">
            A tananyag megtekintéséhez kérlek forgasd fekvő helyzetbe a telefonodat.
          </p>
          <div className="mt-8 flex items-center gap-2 text-white/60">
            <BookOpen className="h-5 w-5" />
            <span className="font-semibold">MatekHelp</span>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-gray-200/50 backdrop-blur-sm">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all shadow-sm"
          style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Header - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Vissza</span>
            </Button>
            
            {/* MatekHelp Brand */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-300">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                MatekHelp
              </span>
            </div>
          </div>
          
          <h1 className="text-base md:text-lg font-semibold text-center flex-1 px-4 text-gray-800">
            {presentation.title}
          </h1>
          
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="flex items-center gap-1 md:gap-2 hover:bg-blue-50"
              title="Diaáttekintés"
            >
              <Grid className="h-4 w-4" />
              <span className="hidden sm:inline">Dia lista</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-1 md:gap-2 hover:bg-blue-50"
              title="Teljes képernyő (F11)"
            >
              <Maximize className="h-4 w-4" />
              <span className="hidden sm:inline">Teljes képernyő</span>
            </Button>
          </div>
        </div>
      )}

      {/* Fullscreen Exit Button - Shown only in fullscreen */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="shadow-lg bg-white/90 backdrop-blur-sm hover:bg-white"
            title="Kilépés a teljes képernyőből (ESC vagy F11)"
          >
            <Minimize className="h-4 w-4 mr-2" />
            Kilépés
          </Button>
        </div>
      )}

      {/* Thumbnail Sidebar */}
      {showThumbnails && !isFullscreen && (
        <>
          {/* Mobile overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowThumbnails(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed md:absolute right-0 top-0 bottom-0 w-64 md:w-48 lg:w-64 bg-white/95 backdrop-blur-md border-l border-gray-200/50 shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-center justify-between shadow-sm">
              <h3 className="font-semibold text-sm text-white">Dia lista ({slides.length})</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThumbnails(false)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-3 space-y-2">
              {slides.map((slide, index) => {
                // Find the highest index of any answered slide
                const lastAnsweredIndex = Math.max(
                  ...Object.keys(userAnswers).map(key => parseInt(key)),
                  -1
                );
                const isAccessible = index <= furthestSlideReached || index <= lastAnsweredIndex;
                return (
                <button
                  key={index}
                  onClick={() => {
                    if (isAccessible) {
                      setCurrentIndex(index);
                      setShowThumbnails(false);
                    }
                  }}
                  disabled={!isAccessible}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all group ${
                    !isAccessible
                      ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-100'
                      : index === currentIndex 
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md hover:shadow-lg' 
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all ${
                      !isAccessible
                        ? 'bg-gray-300 text-gray-500'
                        : index === currentIndex
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 group-hover:bg-blue-500 group-hover:text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 mb-1 line-clamp-2">
                        {slide.title || (slide.type === 'text' && slide.content?.[0]?.children?.[0]?.text) || 'Cím nélküli dia'}
                      </div>
                      
                      {/* Answer indicator */}
                      {userAnswers[index] && (
                        <div className="mt-1 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-xs text-green-600 font-medium">
                            Megválaszolva
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );})}
            </div>
          </div>
        </>
      )}

      {/* Slide container */}
      <div
        className={`flex-1 transition-all ${
          showThumbnails && !isFullscreen ? 'md:mr-48 lg:mr-64' : ''
        } ${currentSlide.type === 'text' ? 'overflow-hidden' : 'overflow-hidden flex items-center justify-center'}`}
        style={{ backgroundColor: slideBackgroundColor, color: slideTextColor }}
      >
        <SlideViewer
          slide={currentSlide}
          userAnswer={userAnswers[currentIndex]}
          onAnswer={(answer, slideIndex, elementIndex) => handleAnswer(answer, slideIndex, elementIndex)}
          textColor={slideTextColor}
          slideIndex={currentIndex}
        />
      </div>

      {/* Navigation Toolbar - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200/50 p-2 md:p-4 shadow-lg z-40">
          {/* Mobile: Vertical Stack */}
          <div className="flex md:hidden flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium text-gray-600">
              Dia {currentIndex + 1} / {slides.length}
            </span>
            {user && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                    style={{ width: `${Math.round(((currentIndex + 1) / slides.length) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  {Math.round(((currentIndex + 1) / slides.length) * 100)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="flex-1 h-12 touch-manipulation border-2 hover:bg-red-50 hover:border-red-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
              disabled={currentIndex === 0}
              className="flex-1 h-12 touch-manipulation border-2 hover:bg-blue-50 hover:border-blue-300"
            >
              Előző
            </Button>
            {isLastSlide ? (
              <Button 
                onClick={() => setShowResults(true)} 
                className="flex-1 h-12 touch-manipulation bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md"
              >
                Eredmények
              </Button>
            ) : (
              <Button 
                onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))} 
                className="flex-1 h-12 touch-manipulation bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md"
              >
                Következő
              </Button>
            )}
          </div>
        </div>

        {/* Desktop: Horizontal Layout */}
        <div className="hidden md:flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="border-2 hover:bg-red-50 hover:border-red-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kilépés a tananyagból
          </Button>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600">
              Dia {currentIndex + 1} / {slides.length}
            </span>
            {user && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                    style={{ width: `${Math.round(((currentIndex + 1) / slides.length) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  {Math.round(((currentIndex + 1) / slides.length) * 100)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
              disabled={currentIndex === 0}
              className="border-2 hover:bg-blue-50 hover:border-blue-300"
            >
              Előző
            </Button>
            {isLastSlide ? (
              <Button 
                onClick={() => setShowResults(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md"
              >
                Eredmények megjelenítése
              </Button>
            ) : (
              <Button 
                onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md"
              >
                Következő
              </Button>
            )}
          </div>
        </div>
        </div>
      )}

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
