import React from 'react';
import isBlock from '../isBlock';

const DefaultElement = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align, whiteSpace: 'pre-line' as const };
  if (element.type === 'paragraph' || element.type === undefined) {
    const hasBlockChild = element.children?.some(isBlock);
    const Tag = hasBlockChild ? 'div' : 'p';
    return (
      <Tag style={style} {...attributes} className="my-2">
        {children}
      </Tag>
    );
  }
  return (
    <div style={style} {...attributes} className="my-2">
      {children}
    </div>
  );
};

export default DefaultElement;
