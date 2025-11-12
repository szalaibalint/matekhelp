import React from 'react';

const BulletedList = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  return (
    <ul style={style} {...attributes} className="list-disc list-inside my-4">
      {children}
    </ul>
  );
};

export default BulletedList;
