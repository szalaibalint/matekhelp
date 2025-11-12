import React from 'react';

const Table = ({ attributes, children }: any) => {
  return (
    <table {...attributes} className="border-collapse border border-gray-300 my-4">
      <tbody>{children}</tbody>
    </table>
  );
};

export default Table;
