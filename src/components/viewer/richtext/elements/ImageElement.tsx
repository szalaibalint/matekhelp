import React from 'react';

const ImageElement = ({ attributes, children, element }: any) => {
  const isAbsolute = element.isAbsolute || false;
  const position = element.position || { x: 0, y: 0 };
  const float = element.float || 'none';
  const align = element.align || 'left';

  return (
    <div 
      {...attributes} 
      className="group my-4"
      style={{
        position: isAbsolute ? 'absolute' : 'relative',
        left: isAbsolute ? `${position.x}px` : undefined,
        top: isAbsolute ? `${position.y}px` : undefined,
        float: !isAbsolute && float !== 'none' ? float as any : undefined,
        margin: !isAbsolute && float !== 'none' ? '0 10px' : isAbsolute ? 0 : '0 auto',
        zIndex: isAbsolute ? 1 : undefined,
        display: isAbsolute ? 'block' : float === 'none' ? 'block' : 'inline-block',
        textAlign: !isAbsolute && float === 'none' ? align as any : undefined,
      }}
    >
      <div className="relative" style={{ display: 'inline-block' }}>
        <img
          src={element.url}
          alt=""
          style={{
            width: element.width,
            height: element.height,
            transform: `rotate(${element.rotation || 0}deg)`,
            maxWidth: '100%',
          }}
          className={`block border-2 border-transparent`}
        />
      </div>
      {children}
    </div>
  );
};

export default ImageElement;
