import React, { useRef, useEffect, useState } from 'react';

interface ResponsiveSlideContainerProps {
  children: React.ReactNode;
  backgroundColor?: string;
  className?: string;
}

// Canvas dimensions matching the editor (16:9 aspect ratio)
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 900;

/**
 * ResponsiveSlideContainer - A container that maintains a 16:9 aspect ratio (1600x900)
 * and scales its content to fit any viewport while preserving proportions.
 * 
 * This ensures consistent rendering across editor, preview, viewer, and mobile devices.
 */
export const ResponsiveSlideContainer: React.FC<ResponsiveSlideContainerProps> = ({
  children,
  backgroundColor = '#ffffff',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const parent = container.parentElement;
      if (!parent) return;

      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      
      // Calculate scale to fit parent while maintaining 16:9 aspect ratio
      const scaleX = parentWidth / CANVAS_WIDTH;
      const scaleY = parentHeight / CANVAS_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);
      
      // Minimum scale to prevent content becoming too small on mobile
      const finalScale = Math.max(0.2, newScale);
      
      setScale(finalScale);
    };

    updateScale();
    
    // Update on window resize
    window.addEventListener('resize', updateScale);
    
    // Also update when parent size changes (e.g., sidebar toggle)
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
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
};
