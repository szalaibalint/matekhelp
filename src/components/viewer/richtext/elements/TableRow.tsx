import React from 'react';

const TableRow = ({ attributes, children }: any) => {
  return <tr {...attributes}>{children}</tr>;
};

export default TableRow;
