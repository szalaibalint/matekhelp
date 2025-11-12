import React from 'react';
import { Slide } from '../../services/SlideService';
import { TextSlideViewer } from './TextSlideViewer';
import { HeadingSlideViewer } from './HeadingSlideViewer';
import { ImageSlideViewer } from './ImageSlideViewer';
import { MultipleChoiceSlideViewer } from './MultipleChoiceSlideViewer';
import { RankingSlideViewer } from './RankingSlideViewer';
import { MatchingSlideViewer } from './MatchingSlideViewer';
import { TrueFalseSlideViewer } from './TrueFalseSlideViewer';
import { FillInBlanksSlideViewer } from './FillInBlanksSlideViewer';

interface SlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: any, slideIndex: number, elementIndex?: number) => void;
  textColor: string;
  slideIndex: number;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ slide, userAnswer, onAnswer, textColor, slideIndex }) => {
  switch (slide.type) {
    case 'text':
      return <TextSlideViewer slide={slide} onAnswer={onAnswer} slideIndex={slideIndex} userAnswers={userAnswer} />;
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
