import React from 'react';
import { Slide } from '../../services/SlideService';

interface ImageSlideViewerProps {
  slide: Slide;
}

export const ImageSlideViewer: React.FC<ImageSlideViewerProps> = ({ slide }) => {
  return (
    <div className="text-center">
      {slide.content.url && (
        <img src={slide.content.url} alt={slide.content.caption} className="max-h-96 mx-auto rounded-lg" />
      )}
      {slide.content.caption && (
        <p
          className="mt-4 text-lg"
          style={{ color: slide.content.captionColor || '#666666' }}
        >
          {slide.content.caption}
        </p>
      )}
    </div>
  );
};
