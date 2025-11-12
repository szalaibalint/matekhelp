import React from 'react';
import Element from './richtext/Element';
import Leaf from './richtext/Leaf';

const RichTextRenderer = ({ content }) => {
  if (!content) {
    return null;
  }

  const renderNode = (node, index) => {
    if (node.text) {
      return <Leaf key={index} leaf={node} attributes={{}}>{node.text}</Leaf>;
    }

    const children = node.children?.map(renderNode);
    return <Element key={index} element={node} attributes={{}}>{children}</Element>;
  };

  return <div style={{ whiteSpace: 'pre-wrap' }}>{content.map(renderNode)}</div>;
};

export default RichTextRenderer;