import React from 'react';
import { Slide } from '../../services/SlideService';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronUp, ChevronDown, Copy, Trash2, Type, Heading, Image as ImageIcon, HelpCircle } from 'lucide-react';

interface SlideListProps {
  slides: Slide[];
  selectedSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: (type: Slide['type']) => void;
  onMoveSlide: (fromIndex: number, toIndex: number) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
}

export const SlideList: React.FC<SlideListProps> = ({
  slides,
  selectedSlideIndex,
  onSelectSlide,
  onAddSlide,
  onMoveSlide,
  onDuplicateSlide,
  onDeleteSlide,
}) => {
  const getSlideIcon = (type: Slide['type']) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'heading': return <Heading className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'multiple_choice': return <HelpCircle className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200">
        <Select onValueChange={(type) => onAddSlide(type as Slide['type'])}>
          <SelectTrigger>
            <SelectValue placeholder="Dia hozzáadása" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="heading">Címsor</SelectItem>
            <SelectItem value="text">Szöveg</SelectItem>
            <SelectItem value="image">Kép</SelectItem>
            <SelectItem value="multiple_choice">Feleletválasztós</SelectItem>
            <SelectItem value="ranking">Sorrendbe rakás</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {slides.map((slide, index) => (
          <Card
            key={slide.id}
            className={`cursor-pointer transition-all ${
              selectedSlideIndex === index ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelectSlide(index)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getSlideIcon(slide.type)}
                  <Badge variant="outline" className="text-xs">
                    {index + 1}
                  </Badge>
                  {slide.points > 0 && (
                    <Badge className="text-xs bg-green-500">
                      {slide.points} pont
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(index, Math.max(0, index - 1));
                    }}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(index, Math.min(slides.length - 1, index + 1));
                    }}
                    disabled={index === slides.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm font-medium truncate mb-1">{slide.title}</p>
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateSlide(index);
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Másolás
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSlide(index);
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Törlés
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
