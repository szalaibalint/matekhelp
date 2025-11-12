import React from 'react';
import { Slide } from '../../services/SlideService';

interface HeadingSlideViewerProps {
  slide: Slide;
  textColor: string;
}

export const HeadingSlideViewer: React.FC<HeadingSlideViewerProps> = ({ slide, textColor }) => {
  return (
    <div className="text-center">
      <h1
        className="text-5xl font-bold mb-4"
        style={{ color: slide.content.textColor || textColor }}
      >
        {slide.content.text}
      </h1>
      {slide.content.subtitle && (
        <p
          className="text-2xl"
          style={{ color: slide.content.subtitleColor || textColor }}
        >
          {slide.content.subtitle}
        </p>
      )}
    </div>
  );
};
