import React from 'react';

const HeadingOne = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align, whiteSpace: 'pre-wrap' as const };
  return (
    <h1 style={style} {...attributes} className="text-3xl font-bold my-4">
      {children}
    </h1>
  );
};

export default HeadingOne;
