import React from 'react';
import { Slide } from '../../services/SlideService';

interface ImageSlideViewerProps {
  slide: Slide;
}

export const ImageSlideViewer: React.FC<ImageSlideViewerProps> = ({ slide }) => {
  return (
    /* Match editor's ScaledSlidePreview layout: text-center px-16 */
    <div className="text-center px-16">
      {slide.content.url && (
        <img 
          src={slide.content.url} 
          alt={slide.content.caption} 
          loading="lazy"
          className="max-h-[700px] w-auto mx-auto rounded-lg object-contain" 
          srcSet={`${slide.content.url}?w=400 400w, ${slide.content.url}?w=800 800w, ${slide.content.url}?w=1200 1200w`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
        />
      )}
      {slide.content.caption && (
        <p
          className="mt-6 text-xl"
          style={{ color: slide.content.captionColor || '#666666' }}
        >
          {slide.content.caption}
        </p>
      )}
    </div>
  );
};
