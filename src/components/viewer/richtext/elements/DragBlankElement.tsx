import React from 'react';

const DragBlankElement = ({ attributes, children, element, isEditor = false }: any) => {
  if (isEditor) {
    return (
      <span
        {...attributes}
        contentEditable={false}
        className="inline-block bg-blue-100 border-2 border-blue-400 border-dashed rounded-md px-4 py-2 mx-1 text-sm font-medium"
      >
        [Kitöltendő doboz #{element.blankIndex + 1}]
        {children}
      </span>
    );
  }

  // In viewer mode, this will be handled by the FillInBlanksSlideViewer
  return (
    <span {...attributes} contentEditable={false} className="inline-block">
      {children}
    </span>
  );
};

export default DragBlankElement;
