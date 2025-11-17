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

    // Check if this is an empty paragraph (only contains empty text)
    const isEmpty = (node.type === 'paragraph' || node.type === 'heading-one' || node.type === 'heading-two' || node.type === 'heading-three' || !node.type) && 
                    node.children?.length === 1 && 
                    Text.isText(node.children[0]) && 
                    node.children[0].text === '';
    
    if (isEmpty) {
      // Render an empty line with appropriate height based on the element type
      let minHeight = '1.5em'; // default for paragraphs
      if (node.type === 'heading-one') minHeight = '2.5em';
      if (node.type === 'heading-two') minHeight = '2em';
      if (node.type === 'heading-three') minHeight = '1.75em';
      
      return <div key={key} style={{ minHeight }}>&nbsp;</div>;
    }

    return <Element key={key} element={node} attributes={{}}>{children}</Element>;
  };

  return (
    <div className="prose prose-lg max-w-none relative min-h-[400px] pt-0 mt-0">
      {content.map((node: any, i: number) => renderNode(node, [i]))}
    </div>
  );
};

