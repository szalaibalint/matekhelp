import React from 'react';

const HeadingThree = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  return (
    <h3 style={style} {...attributes} className="text-xl font-bold my-2">
      {children}
    </h3>
  );
};

export default HeadingThree;
