import React, { useRef, useState, useEffect } from 'react';
import { Slide } from '../../services/SlideService';
import { TextSlideViewer } from './TextSlideViewer';
import { HeadingSlideViewer } from './HeadingSlideViewer';
import { ImageSlideViewer } from './ImageSlideViewer';
import { MultipleChoiceSlideViewer } from './MultipleChoiceSlideViewer';
import { RankingSlideViewer } from './RankingSlideViewer';
import { MatchingSlideViewer } from './MatchingSlideViewer';
import { TrueFalseSlideViewer } from './TrueFalseSlideViewer';
import { FillInBlanksSlideViewer } from './FillInBlanksSlideViewer';

// Canvas dimensions matching the editor
const SLIDE_WIDTH = 1600;
const SLIDE_HEIGHT = 900;

interface SlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: any, slideIndex: number, elementIndex?: number) => void;
  textColor: string;
  slideIndex: number;
}

// Wrapper component that scales content to match the 1600x900 canvas
function ScaledSlideWrapper({ children, slide }: { children: React.ReactNode; slide: Slide }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Dynamic scale based on parent width - matches preview behavior
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          const parentWidth = parent.offsetWidth;
          // Scale to fit parent width, matching preview behavior
          const newScale = parentWidth / SLIDE_WIDTH;
          setScale(newScale);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    // Use aspect ratio container like editor's preview to prevent extra vertical space
    <div className="w-full" style={{ aspectRatio: '16/9' }}>
      <div 
        ref={containerRef}
        className="origin-top-left w-full h-full"
        style={{
          width: `${SLIDE_WIDTH}px`,
          height: `${SLIDE_HEIGHT}px`,
          transform: `scale(${scale})`,
        }}
      >
        {/* Match editor's ScaledSlidePreview layout exactly: flex flex-col items-center justify-center */}
        <div className="w-full h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ slide, userAnswer, onAnswer, textColor, slideIndex }) => {
  // Text slides handle their own scaling
  if (slide.type === 'text') {
    return <TextSlideViewer slide={slide} onAnswer={onAnswer} slideIndex={slideIndex} userAnswers={userAnswer} />;
  }

  // All other slides use the scaled wrapper
  const getSlideContent = () => {
    switch (slide.type) {
      case 'heading':
        return <HeadingSlideViewer slide={slide} textColor={textColor} />;
      case 'image':
        return <ImageSlideViewer slide={slide} />;
      case 'multiple_choice':
        return <MultipleChoiceSlideViewer slide={slide} userAnswer={userAnswer} onAnswer={(answer) => onAnswer(answer, slideIndex)} textColor={textColor} />;
      case 'ranking':
        return <RankingSlideViewer slide={slide} userAnswer={userAnswer} onAnswer={(answer) => onAnswer(answer, slideIndex)} textColor={textColor} />;
      case 'matching':
        return <MatchingSlideViewer slide={slide} userAnswer={userAnswer} onAnswer={(answer) => onAnswer(answer, slideIndex)} textColor={textColor} />;
      case 'true_false':
        return <TrueFalseSlideViewer slide={slide} userAnswer={userAnswer} onAnswer={(answer) => onAnswer(answer, slideIndex)} textColor={textColor} />;
      case 'fill_in_blanks':
        return <FillInBlanksSlideViewer slide={slide} userAnswer={userAnswer} onAnswer={(answer) => onAnswer(answer, slideIndex)} textColor={textColor} />;
      default:
        return null;
    }
  };

  return (
    <ScaledSlideWrapper slide={slide}>
      {getSlideContent()}
    </ScaledSlideWrapper>
  );
};
