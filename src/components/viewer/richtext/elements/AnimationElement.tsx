import React, { useEffect, useState, useRef } from 'react';

const AnimationElement = ({ attributes, children, element }: any) => {
  const isAbsolute = element.isAbsolute || false;
  const position = element.position || { x: 0, y: 0 };
  const float = element.float || 'none';
  const align = element.align || 'left';
  const containerRef = useRef<HTMLDivElement>(null);
  const [responsivePosition, setResponsivePosition] = useState({ x: 0, y: 0 });

  // Use the reference width stored with the element, or default to approximate editor width
  const REFERENCE_WIDTH = element.referenceWidth || 850;

  useEffect(() => {
    if (!isAbsolute || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      
      // Get the parent container - try .prose first, then any parent with width
      let parent = containerRef.current.closest('.prose');
      if (!parent) {
        // Fallback to direct parent or closest div with meaningful width
        parent = containerRef.current.parentElement;
        // Keep going up until we find a container with substantial width
        while (parent && parent.clientWidth < 100) {
          parent = parent.parentElement;
        }
      }
      if (!parent) return;
      
      const parentWidth = parent.clientWidth;
      
      // Convert pixel position to percentage based on reference width, then to actual pixels
      const percentageX = (position.x / REFERENCE_WIDTH) * 100;
      const percentageY = position.y; // Y can stay in pixels
      
      const actualX = (percentageX / 100) * parentWidth;
      
      setResponsivePosition({ x: actualX, y: percentageY });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    
    // Use ResizeObserver for more accurate tracking of parent size changes
    const resizeObserver = new ResizeObserver(updatePosition);
    let parent = containerRef.current.closest('.prose');
    if (!parent) {
      parent = containerRef.current.parentElement;
      while (parent && parent.clientWidth < 100 && parent.parentElement) {
        parent = parent.parentElement;
      }
    }
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      resizeObserver.disconnect();
    };
  }, [isAbsolute, position.x, position.y]);

  return (
    <div 
      ref={containerRef}
      {...attributes} 
      className="group my-4"
      style={{
        position: isAbsolute ? 'absolute' : 'relative',
        left: isAbsolute ? `${responsivePosition.x}px` : undefined,
        top: isAbsolute ? `${responsivePosition.y}px` : undefined,
        float: !isAbsolute && float !== 'none' ? float as any : undefined,
        margin: !isAbsolute && float !== 'none' ? '0 10px' : isAbsolute ? 0 : '0 auto',
        zIndex: isAbsolute ? 1 : undefined,
        display: isAbsolute ? 'block' : float === 'none' ? 'block' : 'inline-block',
        textAlign: !isAbsolute && float === 'none' ? align as any : undefined,
      }}
    >
      <div className="relative" style={{ display: 'inline-block', maxWidth: '100%' }}>
        <video
          src={element.url}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: element.width ? `${element.width}px` : '100%',
            maxWidth: '100%',
            height: 'auto',
            transform: `rotate(${element.rotation || 0}deg)`,
            objectFit: 'cover',
          }}
          className={`block w-full h-auto`}
        />
      </div>
      {children}
    </div>
  );
};

export default AnimationElement;
