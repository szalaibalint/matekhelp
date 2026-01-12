import React, { useRef, useEffect, useState } from 'react';

interface ResponsiveSlideContainerProps {
  children: React.ReactNode;
  backgroundColor?: string;
  className?: string;
}

/**
 * ResponsiveSlideContainer - A container that maintains a 16:9 aspect ratio (1920x1080)
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
      
      // Standard canvas size: 1920x1080 (16:9)
      const canvasWidth = 1920;
      const canvasHeight = 1080;
      
      // Calculate scale to fit parent while maintaining 16:9 aspect ratio
      const scaleX = parentWidth / canvasWidth;
      const scaleY = parentHeight / canvasHeight;
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
          width: 1920,
          height: 1080,
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

// Export constants for use in other components
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
