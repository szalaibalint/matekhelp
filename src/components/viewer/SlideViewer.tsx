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
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Dynamic scale based on available space - matches preview behavior
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current) {
        const wrapper = wrapperRef.current;
        const availableWidth = wrapper.offsetWidth;
        const availableHeight = wrapper.offsetHeight;
        
        // Calculate scale to fit within available space while maintaining aspect ratio
        const scaleX = availableWidth / SLIDE_WIDTH;
        const scaleY = availableHeight / SLIDE_HEIGHT;
        const newScale = Math.min(scaleX, scaleY);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate the actual scaled dimensions
  const scaledWidth = SLIDE_WIDTH * scale;
  const scaledHeight = SLIDE_HEIGHT * scale;

  return (
    // Wrapper fills available space and centers the scaled content
    <div ref={wrapperRef} className="w-full h-full flex items-center justify-center">
      <div 
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          overflow: 'hidden',
        }}
      >
        <div 
          ref={containerRef}
          className="origin-top-left"
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
