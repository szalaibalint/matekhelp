import React from 'react';

const LinkElement = ({ attributes, children, element }: any) => {
  return (
    <a {...attributes} href={element.url} className="text-blue-600 underline">
      {children}
    </a>
  );
};

export default LinkElement;
