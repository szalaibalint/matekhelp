import React from 'react';

const ListItem = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  return (
    <li style={style} {...attributes}>
      {children}
    </li>
  );
};

export default ListItem;
