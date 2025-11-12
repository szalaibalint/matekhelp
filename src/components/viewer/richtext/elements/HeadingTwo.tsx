import React from 'react';

const HeadingTwo = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align, whiteSpace: 'pre-wrap' as const };
  return (
    <h2 style={style} {...attributes} className="text-2xl font-bold my-3">
      {children}
    </h2>
  );
};

export default HeadingTwo;
