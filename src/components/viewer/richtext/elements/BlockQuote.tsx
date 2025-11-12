import React from 'react';

const BlockQuote = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  return (
    <blockquote style={style} {...attributes} className="border-l-4 border-gray-300 pl-4 italic my-4">
      {children}
    </blockquote>
  );
};

export default BlockQuote;
