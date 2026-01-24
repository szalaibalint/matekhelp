import React from 'react';
import { Slide } from '../../services/SlideService';

interface HeadingSlideViewerProps {
  slide: Slide;
  textColor: string;
}

export const HeadingSlideViewer: React.FC<HeadingSlideViewerProps> = ({ slide, textColor }) => {
  return (
    // Match editor's ScaledSlidePreview layout: text-center px-16
    <div className="text-center px-16">
      <h1
        className="font-bold mb-4"
        style={{ 
          color: slide.content.textColor || textColor,
          fontSize: slide.content.fontSize || '48px',
          fontFamily: slide.content.fontFamily || 'Inter'
        }}
      >
        {slide.content.text}
      </h1>
      {slide.content.subtitle && (
        <p
          style={{ 
            color: slide.content.subtitleColor || '#666666',
            fontSize: slide.content.subtitleFontSize || '24px',
            fontFamily: slide.content.subtitleFontFamily || 'Inter'
          }}
        >
          {slide.content.subtitle}
        </p>
      )}
    </div>
  );
};
