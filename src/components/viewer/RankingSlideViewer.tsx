import React, { useState, useEffect } from 'react';
import { Slide } from '../../services/SlideService';
import { GripVertical } from 'lucide-react';

interface RankingSlideViewerProps {
  slide: Slide;
  userAnswer: any;
  onAnswer: (answer: any) => void;
  textColor: string;
}

export const RankingSlideViewer: React.FC<RankingSlideViewerProps> = ({ slide, userAnswer, onAnswer, textColor }) => {
  const [rankingOrder, setRankingOrder] = useState<number[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const items = slide.content.items || [];
    const randomized = items.map((_: any, i: number) => i).sort(() => Math.random() - 0.5);
    setRankingOrder(randomized);
  }, [slide]);

  const handleRankingDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleRankingDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === overIndex) return;

    const newOrder = [...rankingOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(overIndex, 0, removed);

    setRankingOrder(newOrder);
    setDraggedIndex(overIndex);
  };

  const handleRankingDragEnd = () => {
    setDraggedIndex(null);
    onAnswer(rankingOrder);
  };

  return (
    <div className="w-full max-w-2xl">
      <h2
        className="text-4xl font-bold mb-8 text-center"
        style={{ color: slide.content.questionColor || textColor }}
      >
        {slide.content.question}
      </h2>
      <div className="space-y-3">
        {rankingOrder.map((itemIndex: number, displayIndex: number) => {
          const item = slide.content.items[itemIndex];
          const itemData = typeof item === 'string' ? { text: item, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' } : item;
          return (
            <div
              key={itemIndex}
              draggable
              onDragStart={(e) => handleRankingDragStart(e, displayIndex)}
              onDragOver={(e) => handleRankingDragOver(e, displayIndex)}
              onDragEnd={handleRankingDragEnd}
              className="p-4 rounded-lg border-2 text-xl font-medium cursor-move transition-all"
              style={{
                color: itemData.textColor,
                backgroundColor: itemData.bgColor,
                borderColor: itemData.borderColor,
                opacity: draggedIndex === displayIndex ? 0.8 : 1,
                transform: draggedIndex === displayIndex ? 'rotate(2deg) scale(1.05)' : 'none',
                boxShadow: draggedIndex === displayIndex ? '0 10px 25px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <div className="flex items-center space-x-3">
                <GripVertical className="h-5 w-5 text-gray-400" />
                <span className="font-bold text-gray-500 w-8">{displayIndex + 1}.</span>
                <span>{itemData.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
