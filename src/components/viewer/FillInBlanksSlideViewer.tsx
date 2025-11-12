import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { HTML5Backend, getEmptyImage } from 'react-dnd-html5-backend';
import { Slide } from '../../services/SlideService';
import Leaf from './richtext/Leaf';

const ItemTypes = {
  BLANK: 'blank',
};

// Lazy load KaTeX
const loadKatex = async () => {
  const katex = await import('katex');
  return katex.default;
};

const renderMathText = async (text: string): Promise<string> => {
  // Check if text contains LaTeX (starts with backslash)
  if (!text.includes('\\')) {
    return text;
  }
  
  try {
    const katex = await loadKatex();
    return katex.renderToString(text, {
      throwOnError: false,
      displayMode: false,
    });
  } catch (e) {
    return text;
  }
};

const MathText: React.FC<{ text: string }> = ({ text }) => {
  const [html, setHtml] = useState<string>(text);
  
  useEffect(() => {
    renderMathText(text).then(setHtml);
  }, [text]);
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

interface DraggableBlankProps {
  blank: any;
  index: number;
  onDragStart?: (index: number, width: number) => void;
}

const DraggableBlank: React.FC<DraggableBlankProps> = ({ blank, index, onDragStart }) => {
  const itemRef = React.useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.BLANK,
    item: () => {
      const width = itemRef.current?.offsetWidth || 0;
      if (onDragStart) {
        onDragStart(index, width);
      }
      return { index, blankId: blank.id, width };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [blank.id, index, onDragStart]);

  // Hide the default HTML5 drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const setRefs = (element: HTMLDivElement | null) => {
    itemRef.current = element;
    drag(element);
  };

  return (
    <div
      ref={setRefs}
      className="px-6 py-3 rounded-lg cursor-move transition-all text-lg font-medium"
      style={{
        backgroundColor: blank.color || '#ffffff',
        border: '2px solid #d1d5db',
        opacity: isDragging ? 0 : 1,
      }}
    >
      <MathText text={blank.answer} />
    </div>
  );
};

interface DroppableBlankBoxProps {
  blankId: string;
  droppedBlankId: string | null;
  onDrop: (blankId: string, droppedBlankId: string) => void;
  onRemove: (slotId: string) => void;
  droppedAnswer: string | null;
  color: string;
}

const DroppableBlankBox: React.FC<DroppableBlankBoxProps> = ({ 
  blankId, 
  droppedBlankId,
  onDrop, 
  onRemove,
  droppedAnswer, 
  color 
}) => {
  const spanRef = React.useRef<HTMLSpanElement>(null);
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.BLANK,
    drop: (item: { blankId: string }) => {
      onDrop(blankId, item.blankId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  // Make the dropped answer draggable so it can be removed
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.BLANK,
    item: () => {
      if (!droppedBlankId) return null;
      const width = spanRef.current?.offsetWidth || 0;
      return { blankId: droppedBlankId, width };
    },
    canDrag: () => !!droppedBlankId,
    end: (item, monitor) => {
      // If dropped outside any drop zone, remove it from the slot
      if (!monitor.didDrop() && item) {
        onRemove(blankId);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [droppedBlankId, blankId]);

  // Hide the default HTML5 drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const combinedRef = (element: HTMLSpanElement | null) => {
    spanRef.current = element;
    drop(element);
    if (droppedAnswer) {
      drag(element);
    }
  };

  return (
    <span
      ref={combinedRef}
      className="inline-block min-w-[100px] px-4 py-2 mx-1 border-2 border-dashed rounded transition-all"
      style={{
        backgroundColor: isOver ? '#dbeafe' : droppedAnswer ? color : '#f3f4f6',
        borderColor: isOver ? '#3b82f6' : '#d1d5db',
        cursor: droppedAnswer ? 'move' : 'default',
        opacity: isDragging ? 0 : 1,
      }}
    >
      {droppedAnswer ? <MathText text={droppedAnswer} /> : '\u00A0\u00A0\u00A0\u00A0\u00A0'}
    </span>
  );
};

// Custom drag layer for smooth animations
const CustomDragLayer: React.FC<{ blanks: any[] }> = ({ blanks }) => {
  const { itemType, isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  // Find the blank by blankId or index
  const draggingBlank = item?.blankId 
    ? blanks.find(b => b.id === item.blankId)
    : (item?.index !== undefined ? blanks[item.index] : null);
    
  if (!draggingBlank) {
    return null;
  }

  const itemWidth = item?.width || 'auto';

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 100,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
          transition: 'transform 0.05s ease-out',
          width: itemWidth,
        }}
      >
        <div
          className="px-6 py-3 rounded-lg text-lg font-medium shadow-2xl"
          style={{
            backgroundColor: draggingBlank.color || '#ffffff',
            border: '2px solid #3b82f6',
            opacity: 0.9,
            cursor: 'grabbing',
          }}
        >
          <MathText text={draggingBlank.answer} />
        </div>
      </div>
    </div>
  );
};

interface FillInBlanksSlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: any) => void;
  textColor: string;
}

export const FillInBlanksSlideViewer: React.FC<FillInBlanksSlideViewerProps> = ({
  slide,
  userAnswer,
  onAnswer,
  textColor,
}) => {
  const [matches, setMatches] = useState<{ [key: string]: string }>(
    () => userAnswer || {}
  );
  const [shuffledBlanks, setShuffledBlanks] = useState<any[]>(() => {
    const blanks = [...(slide.content.blanks || [])];
    return blanks.sort(() => Math.random() - 0.5);
  });
  
  const currentSlideIdRef = useRef(slide.id);

  // Only reset state when slide ID actually changes (navigation to different slide)
  useEffect(() => {
    if (currentSlideIdRef.current !== slide.id) {
      currentSlideIdRef.current = slide.id;
      
      const blanks = [...(slide.content.blanks || [])];
      const shuffled = blanks.sort(() => Math.random() - 0.5);
      setShuffledBlanks(shuffled);
      setMatches(userAnswer || {});
    }
  }, [slide.id, userAnswer]);

  const handleDrop = (targetBlankId: string, droppedBlankId: string) => {
    setMatches((prevMatches) => {
      const newMatches = { ...prevMatches };
      
      // Remove the dropped blank from its previous position (if it was placed somewhere)
      Object.keys(newMatches).forEach((key) => {
        if (newMatches[key] === droppedBlankId) {
          delete newMatches[key];
        }
      });
      
      // Place the blank in the new target position
      newMatches[targetBlankId] = droppedBlankId;
      
      onAnswer(newMatches);
      return newMatches;
    });
  };

  const handleRemove = (slotId: string) => {
    setMatches((prevMatches) => {
      const newMatches = { ...prevMatches };
      delete newMatches[slotId];
      
      onAnswer(newMatches);
      return newMatches;
    });
  };

  const getUsedBlankIds = () => {
    return Object.values(matches);
  };

  // Render content with droppable boxes
  const renderContent = (nodes: any[]): any[] => {
    return nodes.map((node, index) => {
      if (node.type === 'drag-blank') {
        const blank = (slide.content.blanks || []).find((b: any) => b.id === node.blankId);
        if (!blank) return null;
        
        // Use slotId to identify this specific drop zone
        const slotId = node.slotId || node.blankId; // Fallback for old data
        const droppedBlankId = matches[slotId];
        const droppedBlank = droppedBlankId 
          ? (slide.content.blanks || []).find((b: any) => b.id === droppedBlankId)
          : null;
        
        return (
          <DroppableBlankBox
            key={slotId}
            blankId={slotId}
            droppedBlankId={droppedBlankId}
            onDrop={handleDrop}
            onRemove={handleRemove}
            droppedAnswer={droppedBlank?.answer || null}
            color={blank.color || '#ffffff'}
          />
        );
      }
      
      if (node.text !== undefined) {
        return <Leaf key={index} leaf={node} attributes={{}}>{node.text}</Leaf>;
      }
      
      if (node.children) {
        const children = renderContent(node.children);
        
        switch (node.type) {
          case 'paragraph':
            return <p key={index} className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{children}</p>;
          case 'heading-one':
            return <h1 key={index} className="text-3xl font-bold mb-4" style={{ whiteSpace: 'pre-wrap' }}>{children}</h1>;
          case 'heading-two':
            return <h2 key={index} className="text-2xl font-bold mb-3" style={{ whiteSpace: 'pre-wrap' }}>{children}</h2>;
          case 'list-item':
            return <li key={index} style={{ whiteSpace: 'pre-wrap' }}>{children}</li>;
          case 'bulleted-list':
            return <ul key={index} className="list-disc ml-6 mb-2">{children}</ul>;
          case 'numbered-list':
            return <ol key={index} className="list-decimal ml-6 mb-2">{children}</ol>;
          default:
            return <div key={index} style={{ whiteSpace: 'pre-wrap' }}>{children}</div>;
        }
      }
      
      return null;
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <CustomDragLayer blanks={slide.content.blanks || []} />
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-xl" style={{ color: textColor }}>
          {renderContent(slide.content.content || [])}
        </div>
        
        <div className="mt-8 pt-6 border-t-2 border-gray-300">
          <h3 className="text-lg font-semibold mb-4" style={{ color: textColor }}>
            Húzd a megfelelő választ az üres mezőbe:
          </h3>
          <div className="flex flex-wrap gap-4">
            {shuffledBlanks
              .filter((blank) => !getUsedBlankIds().includes(blank.id))
              .map((blank, index) => (
                <DraggableBlank key={blank.id} blank={blank} index={index} />
              ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};
