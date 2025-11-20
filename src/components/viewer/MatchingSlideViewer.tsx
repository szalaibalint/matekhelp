import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { HTML5Backend, getEmptyImage } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'dnd-multi-backend';
import { Slide } from '../../services/SlideService';
import { Check, X } from 'lucide-react';

// Lazy load KaTeX
const loadKatex = async () => {
  const katex = await import('katex');
  return katex.default;
};

const renderMathText = async (text: string): Promise<string> => {
  if (!text) {
    return text || '';
  }
  
  // Check if text contains any LaTeX
  const hasLatex = text.includes('\\') || text.includes('$');
  if (!hasLatex) {
    return text;
  }
  
  try {
    const katex = await loadKatex();
    let html = text;
    
    // Handle display math first ($$...$$ and \[...\])
    html = html.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: true });
      } catch {
        return match;
      }
    });
    
    html = html.replace(/\\\[([^]*?)\\\]/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: true });
      } catch {
        return match;
      }
    });
    
    // Handle inline math (\(...\) and $...$)
    html = html.replace(/\\\(([^]*?)\\\)/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: false });
      } catch {
        return match;
      }
    });
    
    html = html.replace(/\$([^$]+)\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: false });
      } catch {
        return match;
      }
    });
    
    return html;
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

const ItemTypes = {
  LEFT_ITEM: 'left_item',
};

interface MatchingSlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: any) => void;
  textColor: string;
}

interface DraggableItemProps {
  item: string;
  index: number;
  color: string;
  isMatched: boolean;
  onDragStart?: (index: number, width: number) => void;
}

interface DropZoneProps {
  rightItem: string;
  index: number;
  color: string;
  matchedLeftIndex: number | null;
  onDrop: (leftIndex: number, rightIndex: number) => void;
  leftItems: string[];
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item, index, color, isMatched, onDragStart }) => {
  const itemRef = React.useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.LEFT_ITEM,
    item: () => {
      const width = itemRef.current?.offsetWidth || 0;
      if (onDragStart) {
        onDragStart(index, width);
      }
      return { index, width };
    },
    canDrag: !isMatched,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [isMatched, index, onDragStart]);

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
      className={`p-4 rounded-lg border-2 text-lg font-medium transition-all ${
        isMatched ? 'opacity-50 cursor-not-allowed' : 'cursor-move hover:shadow-lg'
      }`}
      style={{
        backgroundColor: color,
        borderColor: '#d1d5db',
        opacity: isDragging ? 0 : isMatched ? 0.5 : 1,
        transform: isDragging ? 'scale(0.95)' : 'none',
      }}
    >
      <MathText text={item} />
    </div>
  );
};

const DropZone: React.FC<DropZoneProps> = ({ rightItem, index, color, matchedLeftIndex, onDrop, leftItems }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.LEFT_ITEM,
    drop: (item: { index: number }) => {
      onDrop(item.index, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [index, onDrop]);

  const isActive = isOver && canDrop;

  return (
    <div
      ref={drop}
      className={`p-4 rounded-lg border-2 text-lg font-medium transition-all ${
        matchedLeftIndex !== null ? 'border-blue-500' : ''
      }`}
      style={{
        backgroundColor: isActive ? '#dbeafe' : color,
        borderColor: matchedLeftIndex !== null ? '#3b82f6' : isActive ? '#60a5fa' : '#d1d5db',
        borderStyle: matchedLeftIndex !== null ? 'solid' : 'dashed',
        minHeight: '60px',
      }}
    >
      <div className="flex items-center justify-between">
        <span><MathText text={rightItem} /></span>
        {matchedLeftIndex !== null && leftItems[matchedLeftIndex] && (
          <div className="ml-2 text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded">
            ← <MathText text={leftItems[matchedLeftIndex]} />
          </div>
        )}
      </div>
    </div>
  );
};

// Custom drag layer for smooth animations
const CustomDragLayer: React.FC<{ leftItems: { text: string; originalIndex: number; color: string }[] }> = ({ leftItems }) => {
  const { itemType, isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  const draggingItem = leftItems[item?.index];
  if (!draggingItem) {
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
          className="p-4 rounded-lg border-2 text-lg font-medium shadow-2xl"
          style={{
            backgroundColor: draggingItem.color,
            borderColor: '#3b82f6',
            opacity: 0.9,
            cursor: 'grabbing',
          }}
        >
          <MathText text={draggingItem.text} />
        </div>
      </div>
    </div>
  );
};

export const MatchingSlideViewer: React.FC<MatchingSlideViewerProps> = ({ slide, userAnswer, onAnswer, textColor }) => {
  const [leftItems, setLeftItems] = useState<{ text: string; originalIndex: number; color: string }[]>([]);
  const [matches, setMatches] = useState<{ [rightIndex: number]: number }>({});

  useEffect(() => {
    // Randomize left items on mount
    const pairs = slide.content.pairs || [];
    const randomized = pairs.map((pair: any, i: number) => ({
      text: pair.left,
      originalIndex: i,
      color: pair.leftColor || '#ffffff',
    })).sort(() => Math.random() - 0.5);
    setLeftItems(randomized);

    // Restore previous matches if any
    if (userAnswer) {
      setMatches(userAnswer);
    }
  }, [slide]);

  const handleDrop = (leftDisplayIndex: number, rightIndex: number) => {
    const leftOriginalIndex = leftItems[leftDisplayIndex].originalIndex;
    
    // Remove any existing match for this right item
    const newMatches = { ...matches };
    
    // Remove this left item from any other right items
    Object.keys(newMatches).forEach((key) => {
      if (newMatches[parseInt(key)] === leftOriginalIndex) {
        delete newMatches[parseInt(key)];
      }
    });
    
    // Add new match
    newMatches[rightIndex] = leftOriginalIndex;
    
    setMatches(newMatches);
    onAnswer(newMatches);
  };

  const handleReset = () => {
    setMatches({});
    onAnswer({});
  };

  const pairs = slide.content.pairs || [];

  // Create multi-backend options for mouse and touch support
  const backendOptions = {
    backends: [
      {
        backend: HTML5Backend,
        transition: MouseTransition,
      },
      {
        backend: TouchBackend,
        options: { enableMouseEvents: true },
        preview: true,
        transition: TouchTransition,
      },
    ],
  };

  return (
    <DndProvider backend={MultiBackend} options={backendOptions}>
      <CustomDragLayer leftItems={leftItems} />
      <div className="w-full max-w-6xl">
        <h2
          className="text-4xl font-bold mb-8 text-center"
          style={{ color: slide.content.questionColor || textColor }}
        >
          {slide.content.question}
        </h2>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column - Draggable Items */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Elemek</h3>
            <div className="space-y-3">
              {leftItems.map((item, displayIndex) => {
                const isMatched = Object.values(matches).includes(item.originalIndex);
                return (
                  <DraggableItem
                    key={displayIndex}
                    item={item.text}
                    index={displayIndex}
                    color={item.color}
                    isMatched={isMatched}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Column - Drop Zones */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Párosítások</h3>
            <div className="space-y-3">
              {pairs.map((pair: any, index: number) => (
                <DropZone
                  key={index}
                  rightItem={pair.right}
                  index={index}
                  color={pair.rightColor || '#ffffff'}
                  matchedLeftIndex={matches[index] !== undefined ? matches[index] : null}
                  onDrop={handleDrop}
                  leftItems={pairs.map((p: any) => p.left)}
                />
              ))}
            </div>
          </div>
        </div>

        {Object.keys(matches).length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Újrakezdés
            </button>
            <p className="mt-2 text-sm text-gray-600">
              {Object.keys(matches).length} / {pairs.length} párosítás kész
            </p>
          </div>
        )}
      </div>
    </DndProvider>
  );
};
