import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { HTML5Backend, getEmptyImage } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'dnd-multi-backend';
import { Slide } from '../../services/SlideService';
import { GripVertical } from 'lucide-react';

const ItemTypes = {
  RANKING_ITEM: 'ranking_item',
};

interface RankingItemProps {
  itemData: any;
  displayIndex: number;
  draggedIndex: number | null;
  hoverIndex: number | null;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onHover: (index: number) => void;
}

const RankingItem: React.FC<RankingItemProps> = ({ 
  itemData, 
  displayIndex, 
  draggedIndex,
  hoverIndex,
  onMove, 
  onDragStart,
  onDragEnd,
  onHover 
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number>(displayIndex);

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.RANKING_ITEM,
    item: () => {
      const width = itemRef.current?.offsetWidth || 0;
      dragIndexRef.current = displayIndex;
      onDragStart(displayIndex);
      return { displayIndex, width, itemData };
    },
    end: () => {
      onDragEnd();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [displayIndex, itemData, onDragStart, onDragEnd]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.RANKING_ITEM,
    hover: (item: { displayIndex: number }) => {
      const dragIndex = item.displayIndex;
      const hoverIndexCurrent = displayIndex;

      if (dragIndex === hoverIndexCurrent) {
        return;
      }

      onHover(hoverIndexCurrent);
      onMove(dragIndex, hoverIndexCurrent);
      
      // Update the item's displayIndex to prevent repeated calls
      item.displayIndex = hoverIndexCurrent;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [displayIndex, onMove, onHover]);

  // Hide the default HTML5 drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const setRefs = (element: HTMLDivElement | null) => {
    itemRef.current = element;
    drag(drop(element));
  };

  return (
    <div
      ref={setRefs}
      className="p-4 rounded-lg border-2 text-xl font-medium cursor-move"
      style={{
        color: itemData.textColor,
        backgroundColor: itemData.bgColor,
        borderColor: itemData.borderColor,
        opacity: isDragging ? 0 : 1,
        transition: 'opacity 0.2s ease-out',
      }}
    >
      <div className="flex items-center space-x-3">
        <GripVertical className="h-5 w-5 text-gray-400" />
        <span className="font-bold text-gray-500 w-8">{displayIndex + 1}.</span>
        <span>{itemData.text}</span>
      </div>
    </div>
  );
};

// Custom drag layer for smooth animations
const CustomDragLayer: React.FC = () => {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset || !item) {
    return null;
  }

  const itemWidth = item.width || 600;

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
          className="p-4 rounded-lg border-2 text-xl font-medium shadow-2xl"
          style={{
            color: item.itemData.textColor,
            backgroundColor: item.itemData.bgColor,
            borderColor: '#3b82f6',
            opacity: 0.9,
            cursor: 'grabbing',
          }}
        >
          <div className="flex items-center space-x-3">
            <GripVertical className="h-5 w-5 text-gray-400" />
            <span>{item.itemData.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RankingSlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: any) => void;
  textColor: string;
}

export const RankingSlideViewer: React.FC<RankingSlideViewerProps> = ({ slide, userAnswer, onAnswer, textColor }) => {
  const [rankingOrder, setRankingOrder] = useState<number[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const items = slide.content.items || [];
    const randomized = items.map((_: any, i: number) => i).sort(() => Math.random() - 0.5);
    setRankingOrder(randomized);
  }, [slide]);

  const handleMove = (fromIndex: number, toIndex: number) => {
    const newOrder = [...rankingOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setRankingOrder(newOrder);
    onAnswer(newOrder);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  const handleHover = (index: number) => {
    setHoverIndex(index);
  };

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
      <CustomDragLayer />
      <div className="w-full max-w-2xl mx-auto">
        <h2
          className="text-4xl font-bold mb-8 text-center"
          style={{ color: slide.content.questionColor || textColor }}
        >
          {slide.content.question}
        </h2>
        <div className="space-y-3">
          {rankingOrder.map((itemIndex: number, displayIndex: number) => {
            const item = slide.content.items[itemIndex];
            const itemData = typeof item === 'string' 
              ? { text: item, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' } 
              : item;
            
            return (
              <RankingItem
                key={itemIndex}
                itemData={itemData}
                displayIndex={displayIndex}
                draggedIndex={draggedIndex}
                hoverIndex={hoverIndex}
                onMove={handleMove}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onHover={handleHover}
              />
            );
          })}
        </div>
      </div>
    </DndProvider>
  );
};
