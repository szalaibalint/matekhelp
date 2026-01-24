import React from 'react';

const HeadingTwo = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  return (
    <h2 style={style} {...attributes} className="text-2xl font-bold my-3">
      {children}
    </h2>
  );
};

export default HeadingTwo;
