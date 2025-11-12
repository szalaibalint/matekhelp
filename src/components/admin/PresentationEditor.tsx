import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Type,
  Heading,
  Image as ImageIcon,
  HelpCircle,
  Play,
  ArrowLeft,
  Save,
  Copy,
  GripVertical,
  Palette,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ArrowRight,
  Sigma
} from 'lucide-react';
import { supabase } from '../../../supabase/supabase';
import { toast } from '../ui/use-toast';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RichTextEditor } from './RichTextEditor';
import { Descendant } from 'slate';
import { SketchPicker } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import mammoth from 'mammoth';
import RichTextRenderer from '../viewer/RichTextRenderer';
import { MathFormulaInsert } from './MathFormulaInsert';

// Lazy load KaTeX for preview
const loadKatex = async () => {
  const katex = await import('katex');
  return katex.default;
};

const renderMathText = async (text: string): Promise<string> => {
  if (!text || !text.includes('\\')) {
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

interface Slide {
  id: string;
  type: 'text' | 'heading' | 'image' | 'multiple_choice' | 'ranking' | 'matching' | 'true_false' | 'fill_in_blanks';
  title: string;
  content: any;
  settings: any;
  sort_order: number;
  points: number;
  correct_answer: any;
  backgroundColor?: string;
  textColor?: string;
}

interface PresentationEditorProps {
  presentationId: string;
  onBack: () => void;
}

export function PresentationEditor({ presentationId, onBack }: PresentationEditorProps) {
  const [presentation, setPresentation] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadPresentation();
    loadSlides();
  }, [presentationId]);

  const loadPresentation = async () => {
    const { data } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', presentationId)
      .single();

    if (data) {
      setPresentation(data);
    }
  };

  const loadSlides = async () => {
    const { data } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('sort_order');

    if (data) {
      setSlides(data);
    }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      await supabase
        .from('presentations')
        .update({
          title: presentation.title,
          description: presentation.description,
          theme: presentation.theme,
          settings: presentation.settings,
          status: presentation.status
        })
        .eq('id', presentationId);

      await supabase.from('slides').delete().eq('presentation_id', presentationId);

      if (slides.length > 0) {
        const slidesToInsert = slides.map((slide, index) => ({
          presentation_id: presentationId,
          type: slide.type,
          title: slide.title,
          content: slide.content,
          settings: slide.settings,
          sort_order: index,
          points: slide.points || 0,
          correct_answer: slide.correct_answer,
          background_color: slide.backgroundColor,
          text_color: slide.textColor
        }));

        await supabase.from('slides').insert(slidesToInsert);
      }

      toast({
        title: 'Siker',
        description: 'A tananyag sikeresen elmentve',
      });
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addSlide = (type: Slide['type']) => {
    const defaultContent = getDefaultContent(type);
    let defaultPoints = 0;
    let defaultCorrectAnswer = null;
    
    if (type === 'multiple_choice' || type === 'ranking') {
      defaultPoints = 100;
    } else if (type === 'true_false') {
      defaultPoints = 10;
      defaultCorrectAnswer = true;
    } else if (type === 'fill_in_blanks') {
      defaultPoints = 30;
    }
    
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      type,
      title: getDefaultTitle(type),
      content: defaultContent,
      settings: {},
      sort_order: slides.length,
      points: defaultPoints,
      correct_answer: defaultCorrectAnswer
    };

    setSlides([...slides, newSlide]);
    setSelectedSlideIndex(slides.length);
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setSlides(newSlides);
  };

  const deleteSlide = (index: number) => {
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (selectedSlideIndex >= newSlides.length) {
      setSelectedSlideIndex(Math.max(0, newSlides.length - 1));
    }
  };

  const moveSlide = (fromIndex: number, toIndex: number) => {
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);
    setSlides(newSlides);
    setSelectedSlideIndex(toIndex);
  };

  const duplicateSlide = (index: number) => {
    const slide = slides[index];
    const newSlide = {
      ...slide,
      id: `slide-${Date.now()}`,
      sort_order: slides.length
    };
    setSlides([...slides, newSlide]);
  };

  const getDefaultTitle = (type: Slide['type']) => {
    const titles = {
      text: 'Szöveges dia',
      heading: 'Címsor dia',
      image: 'Képes dia',
      multiple_choice: 'Feleletválasztós kérdés',
      ranking: 'Sorrendbe rakás',
      matching: 'Párosítás',
      true_false: 'Igaz vagy hamis',
      fill_in_blanks: 'Szöveg kiegészítés'
    };
    return titles[type];
  };

  const getDefaultContent = (type: Slide['type']) => {
    switch (type) {
      case 'text':
        return [{ type: 'paragraph', children: [{ text: 'Kezdj el írni...' }] }];
      case 'heading':
        return { text: 'Címsor', subtitle: 'Alcím', fontSize: 48 };
      case 'image':
        return { url: '', caption: '' };
      case 'multiple_choice':
        return { 
          question: 'Itt a kérdésed?',
          options: [
            { text: '1. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
            { text: '2. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
            { text: '3. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
            { text: '4. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' }
          ],
          layout: 'grid',
          multipleCorrect: false
        };
      case 'ranking':
        return { 
          question: 'Rakd sorrendbe ezeket az elemeket', 
          items: [
            { text: '1. elem', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
            { text: '2. elem', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
            { text: '3. elem', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' }
          ], 
          correctOrder: [0, 1, 2] 
        };
      case 'matching':
        return {
          question: 'Párosítsd össze az elemeket',
          pairs: [
            { left: 'Elem 1', right: 'Párosítás 1', leftColor: '#ffffff', rightColor: '#ffffff' },
            { left: 'Elem 2', right: 'Párosítás 2', leftColor: '#ffffff', rightColor: '#ffffff' },
            { left: 'Elem 3', right: 'Párosítás 3', leftColor: '#ffffff', rightColor: '#ffffff' }
          ],
          pointsPerPair: 1
        };
      case 'true_false':
        return {
          statement: 'Ez az állítás igaz vagy hamis?',
          statementColor: '#000000'
        };
      case 'fill_in_blanks':
        return {
          content: [{ type: 'paragraph', children: [{ text: 'Kezdj el írni és illessz be kitöltendő mezőket...' }] }],
          blanks: []
        };
      default:
        return {};
    }
  };

  const getSlideIcon = (type: Slide['type']) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'heading': return <Heading className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'multiple_choice': return <HelpCircle className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  const getTotalPoints = () => {
    return slides.reduce((sum, slide) => sum + (slide.points || 0), 0);
  };

  if (!presentation) return null;

  if (isPreviewMode) {
    return (
      <PreviewMode
        slides={slides}
        currentIndex={previewIndex}
        onNext={() => setPreviewIndex(Math.min(slides.length - 1, previewIndex + 1))}
        onPrev={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
        onExit={() => setIsPreviewMode(false)}
        theme={presentation.theme}
      />
    );
  }

  const selectedSlide = slides[selectedSlideIndex];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vissza
          </Button>
          <div>
            <Input
              value={presentation.title}
              onChange={(e) => setPresentation({ ...presentation, title: e.target.value })}
              className="text-xl font-semibold border-none p-0 h-auto"
            />
            <p className="text-sm text-gray-500">{slides.length} dia • {getTotalPoints()} pont</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsPreviewMode(true)} disabled={slides.length === 0}>
            <Play className="h-4 w-4 mr-2" />
            Előnézet
          </Button>
          <Button onClick={saveAll} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Mentés...' : 'Mentés'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slides Panel */}
        {!isSidebarCollapsed && (
          <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <Select onValueChange={(type) => addSlide(type as Slide['type'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Dia hozzáadása" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heading">Címsor</SelectItem>
                  <SelectItem value="text">Szöveg</SelectItem>
                  <SelectItem value="image">Kép</SelectItem>
                  <SelectItem value="multiple_choice">Feleletválasztós</SelectItem>
                  <SelectItem value="ranking">Sorrendbe rakás</SelectItem>
                  <SelectItem value="matching">Párosítás</SelectItem>
                  <SelectItem value="true_false">Igaz/Hamis</SelectItem>
                  <SelectItem value="fill_in_blanks">Szöveg kiegészítés</SelectItem>
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
                  onClick={() => setSelectedSlideIndex(index)}
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
                          duplicateSlide(index);
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
                          deleteSlide(index);
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
        )}

        {/* Editor Panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedSlide ? (
            <SlideEditor
              slide={selectedSlide}
              onChange={(updates) => updateSlide(selectedSlideIndex, updates)}
              theme={presentation.theme}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Type className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Még nincsenek diák</h3>
                <p className="text-gray-500 mb-4">Hozd létre az első diádat a kezdéshez.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate total points from input fields in rich text content
function calculateInputFieldPoints(content: any[]): number {
  let totalPoints = 0;
  
  const traverse = (nodes: any[]) => {
    if (!Array.isArray(nodes)) return;
    
    for (const node of nodes) {
      if (node.type === 'input-field') {
        totalPoints += Number(node.points) || 0;
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  
  traverse(content);
  return totalPoints;
}

// Slide Editor Component
function SlideEditor({ slide, onChange, theme }: { slide: Slide; onChange: (updates: Partial<Slide>) => void; theme: any }) {
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div>
        <Label>Dia címe</Label>
        <Input
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      <div>
        <Label>Háttérszín</Label>
        <div className="flex items-center space-x-2">
          <Popover open={showBgColorPicker} onOpenChange={setShowBgColorPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-12 h-12 p-0"
                style={{ backgroundColor: slide.backgroundColor || theme?.background || '#ffffff' }}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <SketchPicker
                color={slide.backgroundColor || theme?.background || '#ffffff'}
                onChange={(color) => onChange({ backgroundColor: color.hex })}
              />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-gray-500">
            {slide.backgroundColor || theme?.background || '#ffffff'}
          </span>
        </div>
      </div>

      {slide.type === 'text' && (
        <>
          <div>
            <Label>Tartalom</Label>
            <RichTextEditor
              content={slide.content as Descendant[]}
              onChange={(content) => {
                const inputFieldPoints = calculateInputFieldPoints(content);
                onChange({ 
                  content,
                  points: inputFieldPoints
                });
              }}
            />
          </div>
        </>
      )}

      {slide.type === 'heading' && (
        <>
          <div>
            <Label className="flex items-center space-x-2">
              <span>Címsor színe</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    style={{ backgroundColor: slide.content.textColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <SketchPicker
                    color={slide.content.textColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, textColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </Label>
            <Input
              value={slide.content.text || ''}
              onChange={(e) => onChange({ content: { ...slide.content, text: e.target.value } })}
              className="text-2xl font-bold"
            />
          </div>
          <div>
            <Label className="flex items-center space-x-2">
              <span>Alcím színe</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    style={{ backgroundColor: slide.content.subtitleColor || theme?.textColor || '#666666' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <SketchPicker
                    color={slide.content.subtitleColor || theme?.textColor || '#666666'}
                    onChange={(color) => onChange({ content: { ...slide.content, subtitleColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </Label>
            <Input
              value={slide.content.subtitle || ''}
              onChange={(e) => onChange({ content: { ...slide.content, subtitle: e.target.value } })}
            />
          </div>
        </>
      )}

      {slide.type === 'image' && (
        <>
          <div>
            <Label>Kép URL</Label>
            <Input
              value={slide.content.url || ''}
              onChange={(e) => onChange({ content: { ...slide.content, url: e.target.value } })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label className="flex items-center space-x-2">
              <span>Képaláírás</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    style={{ backgroundColor: slide.content.captionColor || '#666666' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <SketchPicker
                    color={slide.content.captionColor || '#666666'}
                    onChange={(color) => onChange({ content: { ...slide.content, captionColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </Label>
            <Input
              value={slide.content.caption || ''}
              onChange={(e) => onChange({ content: { ...slide.content, caption: e.target.value } })}
            />
          </div>
        </>
      )}

      {slide.type === 'multiple_choice' && (
        <>
          <div>
            <Label className="flex items-center space-x-2">
              <span>Kérdés színe</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    style={{ backgroundColor: slide.content.questionColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <SketchPicker
                    color={slide.content.questionColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, questionColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    title="Matematikai kifejezés"
                  >
                    <Sigma className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Matematikai kifejezés beillesztése</DialogTitle>
                  </DialogHeader>
                  <MathFormulaInsert
                    onInsert={(formula) => {
                      const currentQuestion = slide.content.question || '';
                      onChange({ content: { ...slide.content, question: currentQuestion ? `${currentQuestion} ${formula}` : formula } });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </Label>
            <Textarea
              value={slide.content.question || ''}
              onChange={(e) => onChange({ content: { ...slide.content, question: e.target.value } })}
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={slide.content.multipleCorrect || false}
              onCheckedChange={(checked) => onChange({ 
                content: { ...slide.content, multipleCorrect: checked },
                correct_answer: checked ? [] : 0
              })}
            />
            <Label>Több helyes válasz</Label>
          </div>
          <div>
            <Label>Válaszlehetőségek</Label>
            {(slide.content.options || []).map((option: any, index: number) => (
              <div key={index} className="border rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center space-x-2">
                  {slide.content.multipleCorrect ? (
                    <Checkbox
                      checked={Array.isArray(slide.correct_answer) && slide.correct_answer.includes(index)}
                      onCheckedChange={(checked) => {
                        const currentAnswers = Array.isArray(slide.correct_answer) ? slide.correct_answer : [];
                        const newAnswers = checked 
                          ? [...currentAnswers, index]
                          : currentAnswers.filter((i: number) => i !== index);
                        onChange({ correct_answer: newAnswers });
                      }}
                    />
                  ) : (
                    <Checkbox
                      checked={slide.correct_answer === index}
                      onCheckedChange={(checked) => {
                        if (checked) onChange({ correct_answer: index });
                      }}
                    />
                  )}
                  <Input
                    value={option.text || option}
                    onChange={(e) => {
                      const newOptions = [...slide.content.options];
                      if (typeof newOptions[index] === 'string') {
                        newOptions[index] = { text: e.target.value, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' };
                      } else {
                        newOptions[index] = { ...newOptions[index], text: e.target.value };
                      }
                      onChange({ content: { ...slide.content, options: newOptions } });
                    }}
                    className="flex-1"
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0"
                        title="Matematikai kifejezés"
                      >
                        <Sigma className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Matematikai kifejezés beillesztése</DialogTitle>
                      </DialogHeader>
                      <MathFormulaInsert
                        onInsert={(formula) => {
                          const newOptions = [...slide.content.options];
                          const currentText = (typeof newOptions[index] === 'string' ? newOptions[index] : newOptions[index].text) || '';
                          const newText = currentText ? `${currentText} ${formula}` : formula;
                          if (typeof newOptions[index] === 'string') {
                            newOptions[index] = { text: newText, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' };
                          } else {
                            newOptions[index] = { ...newOptions[index], text: newText };
                          }
                          onChange({ content: { ...slide.content, options: newOptions } });
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newOptions = slide.content.options.filter((_: any, i: number) => i !== index);
                      onChange({ content: { ...slide.content, options: newOptions } });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2 ml-8">
                  <Label className="text-xs">Szöveg</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-6 h-6 p-0"
                        style={{ backgroundColor: option.textColor || '#000000' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SketchPicker
                        color={option.textColor || '#000000'}
                        onChange={(color) => {
                          const newOptions = [...slide.content.options];
                          newOptions[index] = { ...newOptions[index], textColor: color.hex };
                          onChange({ content: { ...slide.content, options: newOptions } });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Label className="text-xs ml-2">Háttér</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-6 h-6 p-0"
                        style={{ backgroundColor: option.bgColor || '#ffffff' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SketchPicker
                        color={option.bgColor || '#ffffff'}
                        onChange={(color) => {
                          const newOptions = [...slide.content.options];
                          newOptions[index] = { ...newOptions[index], bgColor: color.hex };
                          onChange({ content: { ...slide.content, options: newOptions } });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Label className="text-xs ml-2">Keret</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-6 h-6 p-0"
                        style={{ backgroundColor: option.borderColor || '#d1d5db' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SketchPicker
                        color={option.borderColor || '#d1d5db'}
                        onChange={(color) => {
                          const newOptions = [...slide.content.options];
                          newOptions[index] = { ...newOptions[index], borderColor: color.hex };
                          onChange({ content: { ...slide.content, options: newOptions } });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newOptions = [...(slide.content.options || []), { text: `Opció ${(slide.content.options?.length || 0) + 1}`, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' }];
                onChange({ content: { ...slide.content, options: newOptions } });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Válaszlehetőség hozzáadása
            </Button>
          </div>
          <div>
            <Label>Pontszám</Label>
            <Input
              type="number"
              value={slide.points || 0}
              onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            />
          </div>
        </>
      )}

      {slide.type === 'ranking' && (
        <>
          <div>
            <Label className="flex items-center space-x-2">
              <span>Kérdés színe</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    style={{ backgroundColor: slide.content.questionColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <SketchPicker
                    color={slide.content.questionColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, questionColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </Label>
            <Textarea
              value={slide.content.question || ''}
              onChange={(e) => onChange({ content: { ...slide.content, question: e.target.value } })}
              rows={3}
            />
          </div>
          <div>
            <Label>Elemek</Label>
            {(slide.content.items || []).map((item: any, index: number) => (
              <div key={index} className="border rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-6">{index + 1}.</span>
                  <Input
                    value={item.text || item}
                    onChange={(e) => {
                      const newItems = [...slide.content.items];
                      if (typeof newItems[index] === 'string') {
                        newItems[index] = { text: e.target.value, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' };
                      } else {
                        newItems[index] = { ...newItems[index], text: e.target.value };
                      }
                      onChange({ content: { ...slide.content, items: newItems } });
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newItems = slide.content.items.filter((_: any, i: number) => i !== index);
                      const newOrder = Array.from({ length: newItems.length }, (_, i) => i);
                      onChange({ 
                        content: { ...slide.content, items: newItems, correctOrder: newOrder }
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2 ml-8">
                  <Label className="text-xs">Szöveg</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-6 h-6 p-0"
                        style={{ backgroundColor: item.textColor || '#000000' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SketchPicker
                        color={item.textColor || '#000000'}
                        onChange={(color) => {
                          const newItems = [...slide.content.items];
                          newItems[index] = { ...newItems[index], textColor: color.hex };
                          onChange({ content: { ...slide.content, items: newItems } });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Label className="text-xs ml-2">Háttér</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-6 h-6 p-0"
                        style={{ backgroundColor: item.bgColor || '#ffffff' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SketchPicker
                        color={item.bgColor || '#ffffff'}
                        onChange={(color) => {
                          const newItems = [...slide.content.items];
                          newItems[index] = { ...newItems[index], bgColor: color.hex };
                          onChange({ content: { ...slide.content, items: newItems } });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Label className="text-xs ml-2">Keret</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-6 h-6 p-0"
                        style={{ backgroundColor: item.borderColor || '#d1d5db' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SketchPicker
                        color={item.borderColor || '#d1d5db'}
                        onChange={(color) => {
                          const newItems = [...slide.content.items];
                          newItems[index] = { ...newItems[index], borderColor: color.hex };
                          onChange({ content: { ...slide.content, items: newItems } });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newItems = [...(slide.content.items || []), { text: `Elem ${(slide.content.items?.length || 0) + 1}`, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' }];
                const newOrder = Array.from({ length: newItems.length }, (_, i) => i);
                onChange({ content: { ...slide.content, items: newItems, correctOrder: newOrder } });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Elem hozzáadása
            </Button>
          </div>
          <div>
            <Label>Pontszám</Label>
            <Input
              type="number"
              value={slide.points || 0}
              onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            />
          </div>
        </>
      )}

      {slide.type === 'matching' && (
        <>
          <div>
            <Label className="flex items-center space-x-2">
              <span>Kérdés színe</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    style={{ backgroundColor: slide.content.questionColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <SketchPicker
                    color={slide.content.questionColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, questionColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </Label>
            <Textarea
              value={slide.content.question || ''}
              onChange={(e) => onChange({ content: { ...slide.content, question: e.target.value } })}
              rows={3}
            />
          </div>
          <div>
            <Label>Párok (Bal oldal ↔ Jobb oldal)</Label>
            {(slide.content.pairs || []).map((pair: any, index: number) => (
              <div key={index} className="border rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-6">{index + 1}.</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newPairs = slide.content.pairs.filter((_: any, i: number) => i !== index);
                      onChange({ 
                        content: { ...slide.content, pairs: newPairs }
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 ml-8">
                  <div>
                    <Label className="text-xs flex items-center space-x-1">
                      <span>Bal oldal</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-5 h-5 p-0 ml-1"
                            style={{ backgroundColor: pair.leftColor || '#ffffff' }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <SketchPicker
                            color={pair.leftColor || '#ffffff'}
                            onChange={(color) => {
                              const newPairs = [...slide.content.pairs];
                              newPairs[index] = { ...newPairs[index], leftColor: color.hex };
                              onChange({ content: { ...slide.content, pairs: newPairs } });
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-5 h-5 p-0 ml-1"
                            title="Matematikai kifejezés"
                          >
                            <Sigma className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Matematikai kifejezés beillesztése</DialogTitle>
                          </DialogHeader>
                          <MathFormulaInsert
                            onInsert={(formula) => {
                              const newPairs = [...slide.content.pairs];
                              const currentLeft = newPairs[index].left || '';
                              newPairs[index] = { ...newPairs[index], left: currentLeft ? `${currentLeft} ${formula}` : formula };
                              onChange({ content: { ...slide.content, pairs: newPairs } });
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </Label>
                    <Input
                      value={pair.left}
                      onChange={(e) => {
                        const newPairs = [...slide.content.pairs];
                        newPairs[index] = { ...newPairs[index], left: e.target.value };
                        onChange({ content: { ...slide.content, pairs: newPairs } });
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center space-x-1">
                      <span>Jobb oldal</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-5 h-5 p-0 ml-1"
                            style={{ backgroundColor: pair.rightColor || '#ffffff' }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <SketchPicker
                            color={pair.rightColor || '#ffffff'}
                            onChange={(color) => {
                              const newPairs = [...slide.content.pairs];
                              newPairs[index] = { ...newPairs[index], rightColor: color.hex };
                              onChange({ content: { ...slide.content, pairs: newPairs } });
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-5 h-5 p-0 ml-1"
                            title="Matematikai kifejezés"
                          >
                            <Sigma className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Matematikai kifejezés beillesztése</DialogTitle>
                          </DialogHeader>
                          <MathFormulaInsert
                            onInsert={(formula) => {
                              const newPairs = [...slide.content.pairs];
                              const currentRight = newPairs[index].right || '';
                              newPairs[index] = { ...newPairs[index], right: currentRight ? `${currentRight} ${formula}` : formula };
                              onChange({ content: { ...slide.content, pairs: newPairs } });
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </Label>
                    <Input
                      value={pair.right}
                      onChange={(e) => {
                        const newPairs = [...slide.content.pairs];
                        newPairs[index] = { ...newPairs[index], right: e.target.value };
                        onChange({ content: { ...slide.content, pairs: newPairs } });
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newPairs = [...(slide.content.pairs || []), { 
                  left: `Elem ${(slide.content.pairs?.length || 0) + 1}`, 
                  right: `Párosítás ${(slide.content.pairs?.length || 0) + 1}`,
                  leftColor: '#ffffff',
                  rightColor: '#ffffff'
                }];
                onChange({ content: { ...slide.content, pairs: newPairs } });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Pár hozzáadása
            </Button>
          </div>
          <div>
            <Label>Pont per helyes párosítás</Label>
            <Input
              type="number"
              value={slide.content.pointsPerPair ?? 1}
              onChange={(e) => {
                const pointsPerPair = parseInt(e.target.value) || 0;
                const totalPoints = pointsPerPair * (slide.content.pairs?.length || 0);
                onChange({ 
                  content: { ...slide.content, pointsPerPair },
                  points: totalPoints
                });
              }}
              min={0}
            />
          </div>
          <div>
            <Label>Összes pontszám</Label>
            <Input
              type="number"
              value={slide.points || 0}
              readOnly
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              {slide.content.pairs?.length || 0} pár × {slide.content.pointsPerPair ?? 1} pont
            </p>
          </div>
        </>
      )}

      {slide.type === 'true_false' && (
        <>
          <div>
            <Label className="flex items-center space-x-2">
              <span>Állítás színe</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    style={{ backgroundColor: slide.content.statementColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <SketchPicker
                    color={slide.content.statementColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, statementColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    title="Matematikai kifejezés"
                  >
                    <Sigma className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Matematikai kifejezés beillesztése</DialogTitle>
                  </DialogHeader>
                  <MathFormulaInsert
                    onInsert={(formula) => {
                      const currentStatement = slide.content.statement || '';
                      const newStatement = currentStatement ? `${currentStatement} ${formula}` : formula;
                      onChange({ content: { ...slide.content, statement: newStatement } });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </Label>
            <Textarea
              value={slide.content.statement || ''}
              onChange={(e) => onChange({ content: { ...slide.content, statement: e.target.value } })}
              rows={4}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label>Helyes válasz</Label>
            <Select
              value={slide.content.correctAnswer === false ? 'false' : 'true'}
              onValueChange={(value) => onChange({ 
                content: { ...slide.content, correctAnswer: value === 'true' },
                correct_answer: value === 'true'
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Igaz</SelectItem>
                <SelectItem value="false">Hamis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pontszám</Label>
            <Input
              type="number"
              value={slide.points || 0}
              onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            />
          </div>
        </>
      )}

      {slide.type === 'fill_in_blanks' && (
        <>
          <div>
            <Label>Szöveg tartalom</Label>
            <RichTextEditor
              content={slide.content.content || []}
              onChange={(content) => onChange({ content: { ...slide.content, content } })}
              enableDragBlanks={true}
              blanks={slide.content.blanks || []}
              onBlanksChange={(blanks) => onChange({ content: { ...slide.content, blanks } })}
            />
          </div>
          <div>
            <Label>Kitöltendő mezők</Label>
            <p className="text-sm text-gray-500 mb-2">
              Előbb hozz létre kitöltendő mezőket, majd illessz be üres dobozokat a szövegbe.
            </p>
            {(slide.content.blanks || []).map((blank: any, index: number) => (
              <div key={index} className="border rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">#{index + 1}</span>
                  <Input
                    value={blank.answer || ''}
                    onChange={(e) => {
                      const newBlanks = [...(slide.content.blanks || [])];
                      newBlanks[index] = { ...newBlanks[index], answer: e.target.value };
                      onChange({ content: { ...slide.content, blanks: newBlanks } });
                    }}
                    placeholder="Helyes válasz"
                    className="flex-1"
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        title="Matematikai kifejezés beszúrása"
                      >
                        <Sigma className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Matematikai kifejezés beillesztése</DialogTitle>
                      </DialogHeader>
                      <MathFormulaInsert 
                        onInsert={(formula) => {
                          const newBlanks = [...(slide.content.blanks || [])];
                          newBlanks[index] = { ...newBlanks[index], answer: formula };
                          onChange({ content: { ...slide.content, blanks: newBlanks } });
                        }} 
                      />
                    </DialogContent>
                  </Dialog>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0"
                        style={{ backgroundColor: blank.color || '#ffffff' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SketchPicker
                        color={blank.color || '#ffffff'}
                        onChange={(color) => {
                          const newBlanks = [...(slide.content.blanks || [])];
                          newBlanks[index] = { ...newBlanks[index], color: color.hex };
                          onChange({ content: { ...slide.content, blanks: newBlanks } });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newBlanks = (slide.content.blanks || []).filter((_: any, i: number) => i !== index);
                      onChange({ content: { ...slide.content, blanks: newBlanks } });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {blank.answer && blank.answer.includes('\\') && (
                  <div className="pl-8 pt-2 border-t">
                    <span className="text-xs text-gray-500">Előnézet: </span>
                    <MathText text={blank.answer} />
                  </div>
                )}
              </div>
            ))}
            <Button
              onClick={() => {
                const newBlank = {
                  id: `blank-${Date.now()}`,
                  answer: '',
                  color: '#ffffff'
                };
                onChange({ content: { ...slide.content, blanks: [...(slide.content.blanks || []), newBlank] } });
              }}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Új kitöltendő mező
            </Button>
          </div>
          <div>
            <Label>Összpontszám</Label>
            <Input
              type="number"
              value={slide.points || 0}
              onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            />
            <p className="text-sm text-gray-500 mt-1">
              A pontok egyenlően oszlanak meg a kitöltendő mezők között.
              {(slide.content.blanks || []).length > 0 && (
                <span> ({Math.floor((slide.points || 0) / (slide.content.blanks || []).length)} pont / mező)</span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Preview Mode Component
function PreviewMode({ slides, currentIndex, onNext, onPrev, onExit, theme }: { slides: Slide[], currentIndex: number, onNext: () => void, onPrev: () => void, onExit: () => void, theme: any }) {
  const currentSlide = slides[currentIndex];
  const [renderedMath, setRenderedMath] = useState<{ [key: string]: string }>({});

  // LaTeX renderer for preview
  const renderLatex = (text: string, key: string) => {
    if (!text || !text.includes('\\')) {
      return <span>{text}</span>;
    }
    
    // Check if already rendered
    if (renderedMath[key]) {
      return <span dangerouslySetInnerHTML={{ __html: renderedMath[key] }} />;
    }
    
    // Load and render KaTeX
    import('katex').then((katex) => {
      try {
        const html = katex.default.renderToString(text, {
          throwOnError: false,
          displayMode: false,
        });
        setRenderedMath(prev => ({ ...prev, [key]: html }));
      } catch (e) {
        setRenderedMath(prev => ({ ...prev, [key]: text }));
      }
    });
    
    // Show loading state
    return <span className="font-mono text-sm">{text}</span>;
  };

  const renderSlideContent = () => {
    switch (currentSlide.type) {
      case 'text':
        return <RichTextRenderer content={currentSlide.content} />;
      case 'heading':
        return (
          <div className="text-center">
            <h1 
              className="text-5xl font-bold"
              style={{ color: currentSlide.content.textColor || theme?.textColor || '#000000' }}
            >
              {currentSlide.content.text}
            </h1>
            <p 
              className="text-2xl mt-4"
              style={{ color: currentSlide.content.subtitleColor || theme?.textColor || '#666666' }}
            >
              {currentSlide.content.subtitle}
            </p>
          </div>
        );
      case 'image':
        return (
          <div className="text-center">
            <img src={currentSlide.content.url} alt={currentSlide.content.caption} className="max-w-full max-h-[70vh] mx-auto" />
            <p 
              className="text-lg mt-4"
              style={{ color: currentSlide.content.captionColor || '#666666' }}
            >
              {currentSlide.content.caption}
            </p>
          </div>
        );
      case 'multiple_choice':
        return (
          <div>
            <h2 
              className="text-3xl font-bold mb-8 text-center"
              style={{ color: currentSlide.content.questionColor || theme?.textColor || '#000000' }}
            >
              <MathText text={currentSlide.content.question} />
            </h2>
            <div className={`grid ${currentSlide.content.layout === 'grid' ? 'grid-cols-2 gap-4' : 'space-y-4'}`}>
              {currentSlide.content.options.map((option: any, index: number) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg text-center text-xl"
                  style={{ 
                    color: option.textColor,
                    backgroundColor: option.bgColor,
                    border: `2px solid ${option.borderColor}`,
                  }}
                >
                  <MathText text={option.text} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'ranking':
        return (
          <div>
            <h2 
              className="text-3xl font-bold mb-8 text-center"
              style={{ color: currentSlide.content.questionColor || theme?.textColor || '#000000' }}
            >
              {currentSlide.content.question}
            </h2>
            <div className="space-y-4">
              {currentSlide.content.items.map((item: any, index: number) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg text-xl flex items-center"
                  style={{ 
                    color: item.textColor,
                    backgroundColor: item.bgColor,
                    border: `2px solid ${item.borderColor}`,
                  }}
                >
                  <span className="font-bold mr-4">{index + 1}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'matching':
        return (
          <div>
            <h2 
              className="text-4xl font-bold mb-8 text-center"
              style={{ color: currentSlide.content.questionColor || theme?.textColor || '#000000' }}
            >
              {currentSlide.content.question}
            </h2>
            <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Left Column */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-300">Elemek</h3>
                <div className="space-y-3">
                  {currentSlide.content.pairs.map((pair: any, index: number) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg border-2 text-lg font-medium"
                      style={{ 
                        backgroundColor: pair.leftColor || '#ffffff',
                        borderColor: '#d1d5db',
                      }}
                    >
                      {renderLatex(pair.left, `left-${index}`)}
                    </div>
                  ))}
                </div>
              </div>
              {/* Right Column */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-300">Párosítások</h3>
                <div className="space-y-3">
                  {currentSlide.content.pairs.map((pair: any, index: number) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg border-2 border-dashed text-lg font-medium"
                      style={{ 
                        backgroundColor: pair.rightColor || '#ffffff',
                        borderColor: '#d1d5db',
                      }}
                    >
                      {renderLatex(pair.right, `right-${index}`)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'true_false':
        return (
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-4xl font-bold mb-12 text-center leading-relaxed"
              style={{ color: currentSlide.content.statementColor || theme?.textColor || '#000000' }}
            >
              {renderLatex(currentSlide.content.statement, 'statement')}
            </h2>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="p-8 rounded-xl border-4 border-gray-300 bg-white">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 flex items-center justify-center text-green-600">✓</div>
                  <span className="text-3xl font-bold text-green-600">IGAZ</span>
                </div>
              </div>
              <div className="p-8 rounded-xl border-4 border-gray-300 bg-white">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 flex items-center justify-center text-red-600">✗</div>
                  <span className="text-3xl font-bold text-red-600">HAMIS</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-lg text-gray-400">
                Helyes válasz: <span className={`font-bold ${currentSlide.content.correctAnswer ? 'text-green-400' : 'text-red-400'}`}>
                  {currentSlide.content.correctAnswer ? 'IGAZ' : 'HAMIS'}
                </span>
              </p>
            </div>
          </div>
        );
      case 'fill_in_blanks':
        const renderFillInBlanksContent = (nodes: any[]): any[] => {
          return nodes.map((node, index) => {
            if (node.type === 'drag-blank') {
              const blank = (currentSlide.content.blanks || []).find((b: any) => b.id === node.blankId);
              if (!blank) return null;
              
              return (
                <span
                  key={index}
                  className="inline-block min-w-[100px] px-4 py-2 mx-1 border-2 border-dashed rounded"
                  style={{
                    backgroundColor: blank.color || '#f3f4f6',
                    borderColor: '#d1d5db',
                  }}
                >
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span>
              );
            }
            
            if (node.text !== undefined) {
              // Render text with formatting
              let content: any = node.text;
              
              if (node.bold) {
                content = <strong>{content}</strong>;
              }
              
              if (node.italic) {
                content = <em>{content}</em>;
              }
              
              if (node.underline) {
                content = <u>{content}</u>;
              }
              
              if (node.code) {
                content = <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{content}</code>;
              }
              
              const style: any = { whiteSpace: 'pre-wrap' };
              
              if (node.color) {
                style.color = node.color;
              }
              
              if (node.backgroundColor) {
                style.backgroundColor = node.backgroundColor;
              }
              
              return <span key={index} style={style}>{content}</span>;
            }
            
            if (node.children) {
              const children = renderFillInBlanksContent(node.children);
              
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
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-xl leading-relaxed" style={{ color: theme?.textColor || '#000000' }}>
              {renderFillInBlanksContent(currentSlide.content.content || [])}
            </div>
            <div className="pt-6 border-t-2 border-gray-300">
              <h3 className="text-lg font-semibold mb-4">Húzható válaszok:</h3>
              <div className="flex flex-wrap gap-4">
                {(currentSlide.content.blanks || []).map((blank: any, index: number) => (
                  <div
                    key={index}
                    className="px-6 py-3 rounded-lg border-2 text-lg font-medium"
                    style={{
                      backgroundColor: blank.color || '#ffffff',
                      borderColor: '#d1d5db',
                    }}
                  >
                    <MathText text={blank.answer || `Válasz ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 text-center">
              <p className="text-lg text-gray-400">
                Összpontszám: <span className="font-bold">{currentSlide.points || 0} pont</span>
                {(currentSlide.content.blanks || []).length > 0 && (
                  <span> • {Math.floor((currentSlide.points || 0) / (currentSlide.content.blanks || []).length)} pont/mező</span>
                )}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center p-8"
      style={{ 
        backgroundColor: currentSlide.backgroundColor || theme?.background || '#ffffff',
        color: currentSlide.textColor || theme?.textColor || '#000000',
      }}
    >
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="w-full">
        {renderSlideContent()}
      </div>

      <div className="absolute bottom-4 flex items-center space-x-4">
        <Button variant="ghost" onClick={onPrev} disabled={currentIndex === 0}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <span>{currentIndex + 1} / {slides.length}</span>
        <Button variant="ghost" onClick={onNext} disabled={currentIndex === slides.length - 1}>
          <ArrowRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}