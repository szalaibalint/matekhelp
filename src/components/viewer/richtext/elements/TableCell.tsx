import React from 'react';

const TableCell = ({ attributes, children }: any) => {
  return (
    <td {...attributes} className="border border-gray-300 p-2">
      {children}
    </td>
  );
};

export default TableCell;
