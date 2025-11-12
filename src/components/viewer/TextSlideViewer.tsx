import React from 'react';
import { Text } from 'slate';
import { Slide } from '../../services/SlideService';
import UserInputElement from './richtext/elements/UserInputElement';
import Element from './richtext/Element';
import Leaf from './richtext/Leaf';

interface TextSlideViewerProps {
  slide: Slide;
  onAnswer: (answer: any, slideIndex: number, elementIndex: number) => void;
  slideIndex: number;
  userAnswers: any;
}

export const TextSlideViewer: React.FC<TextSlideViewerProps> = ({ slide, onAnswer, slideIndex, userAnswers }) => {
  const content = typeof slide.content === 'string' ? JSON.parse(slide.content) : slide.content;
  const inputCounter = { count: 0 };

  const renderNode = (node: any, path: number[]): JSX.Element | JSX.Element[] => {
    const key = path.join('-');

    if (Text.isText(node)) {
      return <Leaf key={key} leaf={node} attributes={{}}>{node.text}</Leaf>;
    }

    const children = node.children.map((n: any, i: number) => renderNode(n, [...path, i]));

    if (node.type === 'input-field') {
      const elementIndex = inputCounter.count;
      inputCounter.count++;
      return (
        <UserInputElement
          key={key}
          element={node}
          onAnswer={onAnswer}
          slideIndex={slideIndex}
          elementIndex={elementIndex}
          userAnswer={userAnswers?.[elementIndex]}
        >
          {children}
        </UserInputElement>
      );
    }

    return <Element key={key} element={node} attributes={{}}>{children}</Element>;
  };

  return (
    <div className="prose prose-lg max-w-none" style={{ whiteSpace: 'pre-wrap' }}>
      {content.map((node: any, i: number) => renderNode(node, [i]))}
    </div>
  );
};

