import React from 'react';

const AnimationElement = ({ attributes, children, element }: any) => {
  const isAbsolute = element.isAbsolute || false;
  const position = element.position || { x: 0, y: 0 };
  const float = element.float || 'none';
  const align = element.align || 'left';
  const width = element.width || 400;
  const height = element.height || 300;
  const rotation = element.rotation || 0;

  // For absolute positioned animations, use pixel positioning (same as editor)
  // The parent container will be scaled to match the 1600x900 canvas
  const positionStyle = isAbsolute ? {
    position: 'absolute' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${width}px`,
    height: 'auto',
    zIndex: 10,
    margin: 0,
  } : {
    position: 'relative' as const,
    float: float !== 'none' ? float as any : undefined,
    margin: float !== 'none' ? '0 10px' : '0 auto',
    display: float === 'none' ? 'block' : 'inline-block',
    textAlign: float === 'none' ? align as any : undefined,
  };

  return (
    <div 
      {...attributes} 
      className="group my-4"
      style={positionStyle}
    >
      <div 
        className="relative" 
        style={{ 
          display: 'inline-block',
          maxWidth: isAbsolute ? 'none' : '100%',
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
        }}
      >
        <video
          src={element.url}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: isAbsolute ? '100%' : (width ? `${width}px` : '100%'),
            maxWidth: isAbsolute ? 'none' : '100%',
            height: 'auto',
            objectFit: 'cover',
          }}
          className="block"
        />
      </div>
      {children}
    </div>
  );
};

export default AnimationElement;
