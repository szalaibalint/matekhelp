import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  Pause, 
  RotateCcw,
  Zap,
  Image,
  Type,
  Video,
  Maximize,
  Move,
  FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Slider } from '../ui/slider';

interface Slide {
  id: string;
  title: string;
  content: {
    elements: SlideElement[];
    background?: {
      type: 'color' | 'image' | 'gradient';
      value: string;
    };
  };
  animation: {
    entrance: string;
    exit: string;
    duration: number;
  };
  transition: {
    type: string;
    duration: number;
  };
}

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'shape';
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: any;
  animation?: {
    type: string;
    delay: number;
    duration: number;
  };
}

interface SlideEditorProps {
  content: { slides: Slide[] };
  onChange: (content: { slides: Slide[] }) => void;
}

export function SlideEditor({ content, onChange }: SlideEditorProps) {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  const slides = content.slides || [];
  const selectedSlide = slides[selectedSlideIndex];
  const selectedElement = selectedSlide?.content.elements.find(el => el.id === selectedElementId);

  const addSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: `Dia ${slides.length + 1}`,
      content: {
        elements: [],
        background: { type: 'color', value: '#ffffff' }
      },
      animation: {
        entrance: 'fadeIn',
        exit: 'fadeOut',
        duration: 500
      },
      transition: {
        type: 'slide',
        duration: 300
      }
    };

    const newSlides = [...slides, newSlide];
    onChange({ slides: newSlides });
    setSelectedSlideIndex(newSlides.length - 1);
  };

  const deleteSlide = (index: number) => {
    const newSlides = slides.filter((_, i) => i !== index);
    onChange({ slides: newSlides });
    if (selectedSlideIndex >= newSlides.length) {
      setSelectedSlideIndex(Math.max(0, newSlides.length - 1));
    }
  };

  const moveSlide = (fromIndex: number, toIndex: number) => {
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);
    onChange({ slides: newSlides });
    setSelectedSlideIndex(toIndex);
  };

  const updateSlide = (updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[selectedSlideIndex] = { ...selectedSlide, ...updates };
    onChange({ slides: newSlides });
  };

  const addElement = (type: SlideElement['type']) => {
    if (!selectedSlide) return;

    const newElement: SlideElement = {
      id: `element-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      position: { x: 100, y: 100 },
      size: getDefaultSize(type),
      style: getDefaultStyle(type),
      animation: {
        type: 'fadeIn',
        delay: 0,
        duration: 500
      }
    };

    const updatedElements = [...selectedSlide.content.elements, newElement];
    updateSlide({
      content: {
        ...selectedSlide.content,
        elements: updatedElements
      }
    });
    setSelectedElementId(newElement.id);
  };

  const updateElement = (elementId: string, updates: Partial<SlideElement>) => {
    if (!selectedSlide) return;

    const updatedElements = selectedSlide.content.elements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    );

    updateSlide({
      content: {
        ...selectedSlide.content,
        elements: updatedElements
      }
    });
  };

  const deleteElement = (elementId: string) => {
    if (!selectedSlide) return;

    const updatedElements = selectedSlide.content.elements.filter(el => el.id !== elementId);
    updateSlide({
      content: {
        ...selectedSlide.content,
        elements: updatedElements
      }
    });
    setSelectedElementId(null);
  };

  const getDefaultContent = (type: SlideElement['type']) => {
    switch (type) {
      case 'text': return { text: 'Új szöveg', fontSize: 24, fontFamily: 'Arial' };
      case 'image': return { url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80', alt: 'Kép' };
      case 'video': return { url: '', autoplay: false };
      case 'shape': return { shape: 'rectangle', fill: '#3b82f6' };
      default: return {};
    }
  };

  const getDefaultSize = (type: SlideElement['type']) => {
    switch (type) {
      case 'text': return { width: 200, height: 50 };
      case 'image': return { width: 300, height: 200 };
      case 'video': return { width: 400, height: 225 };
      case 'shape': return { width: 100, height: 100 };
      default: return { width: 100, height: 100 };
    }
  };

  const getDefaultStyle = (type: SlideElement['type']) => {
    switch (type) {
      case 'text': return { color: '#000000', backgroundColor: 'transparent' };
      case 'image': return { borderRadius: 0, opacity: 1 };
      case 'video': return { borderRadius: 0 };
      case 'shape': return { borderRadius: 0, opacity: 1 };
      default: return {};
    }
  };

  if (isPreviewMode) {
    return (
      <div className="h-full bg-black flex flex-col">
        <div className="p-4 bg-gray-900 flex items-center justify-between">
          <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
            Előnézet elhagyása
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewSlideIndex(Math.max(0, previewSlideIndex - 1))}
              disabled={previewSlideIndex === 0}
            >
              Előző
            </Button>
            <span className="text-white">
              {previewSlideIndex + 1} / {slides.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewSlideIndex(Math.min(slides.length - 1, previewSlideIndex + 1))}
              disabled={previewSlideIndex === slides.length - 1}
            >
              Következő
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {slides[previewSlideIndex] && (
            <SlidePreview slide={slides[previewSlideIndex]} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Slide Thumbnails */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Diák</h3>
            <Button size="sm" onClick={addSlide}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setIsPreviewMode(true)}
          >
            <Play className="h-4 w-4 mr-1" />
            Előnézet
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`relative group cursor-pointer border-2 rounded-lg p-2 ${
                selectedSlideIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
              onClick={() => setSelectedSlideIndex(index)}
            >
              <div className="aspect-video bg-white border border-gray-100 rounded mb-2 overflow-hidden">
                <div className="w-full h-full relative" style={{ backgroundColor: slide.content.background?.value || '#ffffff' }}>
                  {slide.content.elements.map((element) => (
                    <div
                      key={element.id}
                      className="absolute"
                      style={{
                        left: `${(element.position.x / 800) * 100}%`,
                        top: `${(element.position.y / 600) * 100}%`,
                        width: `${(element.size.width / 800) * 100}%`,
                        height: `${(element.size.height / 600) * 100}%`,
                      }}
                    >
                      <ElementRenderer element={element} isThumb />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs font-medium truncate">{slide.title}</div>
              <div className="text-xs text-gray-500">Dia {index + 1}</div>
              
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSlide(index, Math.max(0, index - 1));
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
                    moveSlide(index, Math.min(slides.length - 1, index + 1));
                  }}
                  disabled={index === slides.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSlide(index);
                  }}
                  disabled={slides.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {selectedSlide ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  value={selectedSlide.title}
                  onChange={(e) => updateSlide({ title: e.target.value })}
                  className="w-48"
                />
                <Badge variant="outline">
                  {selectedSlideIndex + 1} / {slides.length}
                </Badge>
              </div>

              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={() => addElement('text')}>
                  <Type className="h-4 w-4 mr-1" />
                  Szöveg
                </Button>
                <Button size="sm" onClick={() => addElement('image')}>
                  <Image className="h-4 w-4 mr-1" />
                  Kép
                </Button>
                <Button size="sm" onClick={() => addElement('video')}>
                  <Video className="h-4 w-4 mr-1" />
                  Videó
                </Button>
                <Button size="sm" onClick={() => addElement('shape')}>
                  <div className="h-4 w-4 mr-1 bg-current rounded" />
                  Alakzat
                </Button>
              </div>
            </div>

            <div className="flex-1 flex">
              {/* Canvas */}
              <div className="flex-1 p-4 bg-gray-100">
                <div className="relative bg-white rounded-lg shadow-lg mx-auto" style={{ width: 800, height: 600 }}>
                  <SlideCanvas
                    slide={selectedSlide}
                    selectedElementId={selectedElementId}
                    onElementSelect={setSelectedElementId}
                    onElementUpdate={updateElement}
                  />
                </div>
              </div>

              {/* Properties Panel */}
              <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                <Tabs defaultValue="slide" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="slide">Dia</TabsTrigger>
                    <TabsTrigger value="element">Elem</TabsTrigger>
                  </TabsList>

                  <TabsContent value="slide" className="flex-1 p-4 space-y-4">
                    <SlideProperties slide={selectedSlide} onUpdate={updateSlide} />
                  </TabsContent>

                  <TabsContent value="element" className="flex-1 p-4 space-y-4">
                    {selectedElement ? (
                      <ElementProperties
                        element={selectedElement}
                        onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                        onDelete={() => deleteElement(selectedElement.id)}
                      />
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        Válassz ki egy elemet a tulajdonságainak szerkesztéséhez
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Még nincsenek diák</h3>
              <p className="text-gray-500 mb-4">Hozd létre az első diádat a kezdéshez.</p>
              <Button onClick={addSlide}>
                <Plus className="h-4 w-4 mr-1" />
                Első dia létrehozása
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SlideCanvas = ({ slide, selectedElementId, onElementSelect, onElementUpdate }: any) => (
  <div 
    className="w-full h-full relative overflow-hidden rounded-lg"
    style={{ backgroundColor: slide.content.background?.value || '#ffffff' }}
  >
    {slide.content.elements.map((element: SlideElement) => (
      <div
        key={element.id}
        className={`absolute cursor-pointer border-2 ${
          selectedElementId === element.id ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
        }`}
        style={{
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
        }}
        onClick={() => onElementSelect(element.id)}
      >
        <ElementRenderer element={element} />
        {selectedElementId === element.id && (
          <div className="absolute -top-1 -right-1">
            <Button
              size="sm"
              variant="destructive"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onElementUpdate(element.id, { deleted: true });
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    ))}
  </div>
);

const ElementRenderer = ({ element, isThumb = false }: { element: SlideElement; isThumb?: boolean }) => {
  const scale = isThumb ? 0.1 : 1;
  
  switch (element.type) {
    case 'text':
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            color: element.style.color,
            backgroundColor: element.style.backgroundColor,
            fontSize: (element.content.fontSize || 24) * scale,
            fontFamily: element.content.fontFamily || 'Arial',
          }}
        >
          {element.content.text}
        </div>
      );
    case 'image':
      return (
        <img
          src={element.content.url}
          alt={element.content.alt}
          loading="lazy"
          className="w-full h-full object-cover"
          style={{ borderRadius: element.style.borderRadius || 0 }}
        />
      );
    case 'video':
      return (
        <video
          src={element.content.url}
          className="w-full h-full object-cover"
          controls={!isThumb}
          style={{ borderRadius: element.style.borderRadius || 0 }}
        />
      );
    case 'shape':
      return (
        <div
          className="w-full h-full"
          style={{
            backgroundColor: element.content.fill,
            borderRadius: element.style.borderRadius || 0,
            opacity: element.style.opacity || 1,
          }}
        />
      );
    default:
      return <div className="w-full h-full bg-gray-200" />;
  }
};

const SlideProperties = ({ slide, onUpdate }: { slide: Slide; onUpdate: (updates: Partial<Slide>) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Háttér</label>
      <div className="space-y-2">
        <Select
          value={slide.content.background?.type || 'color'}
          onValueChange={(type) => onUpdate({
            content: {
              ...slide.content,
              background: { type: type as any, value: slide.content.background?.value || '#ffffff' }
            }
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Egyszínű</SelectItem>
            <SelectItem value="image">Kép</SelectItem>
            <SelectItem value="gradient">Színátmenet</SelectItem>
          </SelectContent>
        </Select>
        
        {slide.content.background?.type === 'color' && (
          <Input
            type="color"
            value={slide.content.background.value}
            onChange={(e) => onUpdate({
              content: {
                ...slide.content,
                background: { ...slide.content.background, value: e.target.value }
              }
            })}
          />
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">Belépő animáció</label>
      <Select
        value={slide.animation.entrance}
        onValueChange={(entrance) => onUpdate({
          animation: { ...slide.animation, entrance }
        })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fadeIn">Áttűnés</SelectItem>
          <SelectItem value="slideInLeft">Beúszás balról</SelectItem>
          <SelectItem value="slideInRight">Beúszás jobbról</SelectItem>
          <SelectItem value="slideInUp">Beúszás fentről</SelectItem>
          <SelectItem value="slideInDown">Beúszás lentről</SelectItem>
          <SelectItem value="zoomIn">Nagyítás</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">Átmenet típusa</label>
      <Select
        value={slide.transition.type}
        onValueChange={(type) => onUpdate({
          transition: { ...slide.transition, type }
        })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="slide">Csúszás</SelectItem>
          <SelectItem value="fade">Áttűnés</SelectItem>
          <SelectItem value="zoom">Nagyítás</SelectItem>
          <SelectItem value="flip">Pörgetés</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

const ElementProperties = ({ element, onUpdate, onDelete }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-medium capitalize">{element.type} Elem</h3>
      <Button size="sm" variant="destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>

    {element.type === 'text' && (
      <>
        <div>
          <label className="block text-sm font-medium mb-2">Szöveg</label>
          <Textarea
            value={element.content.text}
            onChange={(e) => onUpdate({
              content: { ...element.content, text: e.target.value }
            })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Betűméret</label>
          <Slider
            value={[element.content.fontSize || 24]}
            onValueChange={([fontSize]) => onUpdate({
              content: { ...element.content, fontSize }
            })}
            min={8}
            max={72}
            step={1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Szín</label>
          <Input
            type="color"
            value={element.style.color || '#000000'}
            onChange={(e) => onUpdate({
              style: { ...element.style, color: e.target.value }
            })}
          />
        </div>
      </>
    )}

    {element.type === 'image' && (
      <div>
        <label className="block text-sm font-medium mb-2">Kép URL</label>
        <Input
          value={element.content.url}
          onChange={(e) => onUpdate({
            content: { ...element.content, url: e.target.value }
          })}
          placeholder="Kép URL beillesztése"
        />
      </div>
    )}

    <div>
      <label className="block text-sm font-medium mb-2">Animáció</label>
      <Select
        value={element.animation?.type || 'fadeIn'}
        onValueChange={(type) => onUpdate({
          animation: { ...element.animation, type }
        })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fadeIn">Áttűnés</SelectItem>
          <SelectItem value="slideInLeft">Beúszás balról</SelectItem>
          <SelectItem value="slideInRight">Beúszás jobbról</SelectItem>
          <SelectItem value="bounceIn">Beugrás</SelectItem>
          <SelectItem value="zoomIn">Nagyítás</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

const SlidePreview = ({ slide }: { slide: Slide }) => (
  <div 
    className="relative bg-white rounded-lg shadow-2xl"
    style={{ width: 1000, height: 750, backgroundColor: slide.content.background?.value || '#ffffff' }}
  >
    {slide.content.elements.map((element) => (
      <div
        key={element.id}
        className="absolute"
        style={{
          left: (element.position.x / 800) * 1000,
          top: (element.position.y / 600) * 750,
          width: (element.size.width / 800) * 1000,
          height: (element.size.height / 600) * 750,
        }}
      >
        <ElementRenderer element={{
          ...element,
          content: element.type === 'text' ? {
            ...element.content,
            fontSize: (element.content.fontSize || 24) * 1.25
          } : element.content
        }} />
      </div>
    ))}
  </div>
);