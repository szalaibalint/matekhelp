import React from 'react';
import isBlock from '../isBlock';

const DefaultElement = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  
  // Check if the paragraph is empty (only contains empty text nodes or whitespace)
  const isEmpty = element.children?.every((child: any) => 
    child.text === '' || child.text === ' ' || (typeof child.text === 'string' && child.text.trim() === '')
  );
  
  if (element.type === 'paragraph' || element.type === undefined) {
    const hasBlockChild = element.children?.some(isBlock);
    const Tag = hasBlockChild ? 'div' : 'p';
    return (
      <Tag 
        style={style} 
        {...attributes} 
        className={`my-2 ${hasBlockChild ? 'leading-relaxed' : ''} ${isEmpty ? 'min-h-[1.5em]' : ''}`}
      >
        {/* Add a zero-width space for empty lines to maintain height */}
        {isEmpty ? <span className="invisible">&#8203;</span> : null}
        {children}
      </Tag>
    );
  }
  return (
    <div style={style} {...attributes} className={`my-2 ${isEmpty ? 'min-h-[1.5em]' : ''}`}>
      {isEmpty ? <span className="invisible">&#8203;</span> : null}
      {children}
    </div>
  );
};

export default DefaultElement;
