import React from 'react';

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  const style: any = {};
  
  if (leaf.color) {
    style.color = leaf.color;
  }
  
  if (leaf.backgroundColor) {
    style.backgroundColor = leaf.backgroundColor;
  }

  return <span {...attributes} style={style}>{children}</span>;
};

export default Leaf;
