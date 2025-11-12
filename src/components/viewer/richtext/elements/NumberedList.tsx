import React from 'react';

const NumberedList = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  return (
    <ol style={style} {...attributes} className="list-decimal list-inside my-4">
      {children}
    </ol>
  );
};

export default NumberedList;
