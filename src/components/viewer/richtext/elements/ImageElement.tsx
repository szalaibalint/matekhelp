import React from 'react';

const ImageElement = ({ attributes, children, element }: any) => {
  return (
    <div {...attributes} className="relative inline-block group my-4">
      <div className="relative">
        <img
          src={element.url}
          alt=""
          style={{
            width: element.width,
            height: element.height,
            transform: `rotate(${element.rotation}deg)`,
            maxWidth: '100%',
            float: element.float,
          }}
          className={`block border-2 border-transparent`}
        />
      </div>
      {children}
    </div>
  );
};

export default ImageElement;
