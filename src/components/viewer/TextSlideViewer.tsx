import React, { useRef, useState, useEffect } from 'react';
import { Text } from 'slate';
import { Slide } from '../../services/SlideService';
import UserInputElement from './richtext/elements/UserInputElement';
import Element from './richtext/Element';
import Leaf from './richtext/Leaf';
import { ResponsiveSlideContainer, CANVAS_WIDTH, CANVAS_HEIGHT } from '../shared/ResponsiveSlideContainer';

// Editor canvas dimensions
const SLIDE_WIDTH = 1600;
const SLIDE_HEIGHT = 900;

interface TextSlideViewerProps {
  slide: Slide;
  onAnswer: (answer: any, slideIndex: number, elementIndex: number) => void;
  slideIndex: number;
  userAnswers: any;
}

// Helper function to render slide elements (text, images, etc.)
const renderElement = (element: any) => {
  switch (element.type) {
    case 'text':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: element.content.color || '#000000',
            fontSize: element.content.fontSize || 24,
            fontFamily: element.content.fontFamily || 'Arial',
            fontWeight: element.content.bold ? 'bold' : 'normal',
            fontStyle: element.content.italic ? 'italic' : 'normal',
            textDecoration: element.content.underline ? 'underline' : 'none',
            textAlign: element.content.align || 'left',
          }}
        >
          {element.content.text}
        </div>
      );
    case 'image':
      return (
        <img
          src={element.content.url}
          alt={element.content.alt || ''}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: element.style?.borderRadius || 0,
          }}
        />
      );
    case 'animation':
      return (
        <video
          src={element.content.url}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: element.style?.borderRadius || 0,
          }}
        />
      );
    case 'video':
      return (
        <video
          src={element.content.url}
          controls
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: element.style?.borderRadius || 0,
          }}
        />
      );
    case 'shape':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: element.content.fill || '#cccccc',
            borderRadius: element.content.shape === 'circle' ? '50%' : element.style?.borderRadius || 0,
          }}
        />
      );
    default:
      return null;
  }
};

export const TextSlideViewer: React.FC<TextSlideViewerProps> = ({ slide, onAnswer, slideIndex, userAnswers }) => {
  const content = typeof slide.content === 'string' ? JSON.parse(slide.content) : slide.content;
  
  // Check if this is a word-style slide with positioned elements
  if (content.slides && content.slides[0]?.content.elements) {
    const slideData = content.slides[0];
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full" style={{ aspectRatio: '16/9', maxHeight: '80vh' }}>
          <ResponsiveSlideContainer backgroundColor={slideData.content.background?.value || '#ffffff'}>
            {slideData.content.elements.map((element: any) => (
              <div
                key={element.id}
                className="absolute"
                style={{
                  left: `${(element.position.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(element.position.y / CANVAS_HEIGHT) * 100}%`,
                  width: `${(element.size.width / CANVAS_WIDTH) * 100}%`,
                  height: `${(element.size.height / CANVAS_HEIGHT) * 100}%`,
                }}
              >
                {renderElement(element)}
              </div>
            ))}
          </ResponsiveSlideContainer>
        </div>
      </div>
    );
  }
  
  // Original rich text content rendering with scaled container
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

  // Get the stored slide height
  const slideHeight = slide.settings?.slideHeight || SLIDE_HEIGHT;

  // Check if content has any absolute positioned images or animations
  const hasAbsoluteElements = content.some((node: any) => {
    if ((node.type === 'image' || node.type === 'animation') && node.isAbsolute) return true;
    // Check nested children
    const checkChildren = (children: any[]): boolean => {
      if (!children) return false;
      return children.some((child: any) => {
        if ((child.type === 'image' || child.type === 'animation') && child.isAbsolute) return true;
        return checkChildren(child.children);
      });
    };
    return checkChildren(node.children);
  });

  // If there are absolute positioned elements, use a scaled container matching the editor's 1600x900 canvas
  if (hasAbsoluteElements) {
    return <ScaledTextSlideContent content={content} renderNode={renderNode} slideHeight={slideHeight} />;
  }

  // For simple text content without absolute elements, use full-width layout
  return (
    <div className="w-full h-full p-4 md:p-8 overflow-auto">
      <div className="prose prose-lg max-w-none">
        {content.map((node: any, i: number) => renderNode(node, [i]))}
      </div>
    </div>
  );
};

// Component that scales content to match the editor's 1600x900 canvas
function ScaledTextSlideContent({ 
  content, 
  renderNode,
  slideHeight = SLIDE_HEIGHT
}: { 
  content: any[]; 
  renderNode: (node: any, path: number[]) => JSX.Element | JSX.Element[];
  slideHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          const parentWidth = parent.offsetWidth;
          // Scale based on width only, like the preview does
          const newScale = parentWidth / SLIDE_WIDTH;
          setScale(newScale);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, []);

  const needsScroll = slideHeight > SLIDE_HEIGHT;

  return (
    <div 
      className="w-full h-full viewer-scroll-container"
      style={{
        overflowX: 'hidden',
        overflowY: needsScroll ? 'auto' : 'hidden',
        scrollbarGutter: 'stable',
      }}
    >
      <style>{`
        .viewer-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .viewer-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .viewer-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .viewer-scroll-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
      <div 
        ref={containerRef}
        className="origin-top-left"
        style={{
          width: `${SLIDE_WIDTH}px`,
          minHeight: `${slideHeight}px`,
          transform: `scale(${scale})`,
        }}
      >
        <div className="w-full p-8 overflow-visible relative" style={{ paddingRight: '24px' }}>
          <div className="prose prose-lg max-w-none relative" style={{ whiteSpace: 'pre-wrap' }}>
            {content.map((node: any, i: number) => renderNode(node, [i]))}
          </div>
        </div>
      </div>
    </div>
  );
}