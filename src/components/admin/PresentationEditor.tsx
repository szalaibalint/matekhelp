import { useState, useEffect, useRef } from 'react';
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
  Sigma,
  Loader2,
  Settings,
  MessageSquare,
  Sparkles,
  PaintBucket,
  LayoutTemplate,
  Share2,
  Eye,
  ChevronRight,
  ListOrdered,
  Link2,
  ToggleLeft,
  PenLine,
  BarChart3,
  FileText as FileTextIcon,
  Edit3,
  SlidersHorizontal,
  PanelRightClose,
  PanelRightOpen,
  ImagePlus,
  Clipboard,
  ClipboardPaste,
  MoreHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';
import { supabase } from '../../../supabase/supabase';
import { toast } from '../ui/use-toast';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RichTextEditor } from './RichTextEditor';
import { Descendant } from 'slate';
import { SketchPicker } from '../ui/color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import mammoth from 'mammoth';
import RichTextRenderer from '../viewer/RichTextRenderer';
import { MathFormulaInsert } from './MathFormulaInsert';

// Lazy load KaTeX for preview
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

interface Slide {
  id: string;
  type: 'text' | 'heading' | 'image' | 'multiple_choice' | 'ranking' | 'matching' | 'true_false' | 'fill_in_blanks';
  title: string;
  content: any;
  settings: any;
  sort_order: number;
  points: number | string;
  correct_answer: any;
  backgroundColor?: string;
  textColor?: string;
}

interface PresentationEditorProps {
  presentationId: string;
  onBack: () => void;
}

// Global clipboard for slides (persists across presentations)
const slideClipboard: { slides: Slide[], sourcePresentationId?: string } = { slides: [] };

export function PresentationEditor({ presentationId, onBack }: PresentationEditorProps) {
  const [presentation, setPresentation] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedSlideIndices, setSelectedSlideIndices] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [clipboardCount, setClipboardCount] = useState(slideClipboard.slides.length);
  const [rightPanelWidth, setRightPanelWidth] = useState(320); // Default w-80 = 320px
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'edit' | 'settings' | 'themes'>('edit');

  useEffect(() => {
    loadPresentation();
    loadSlides();
  }, [presentationId]);

  // Debug: Log text slide height when slide changes
  useEffect(() => {
    if (slides.length > 0 && selectedSlideIndex < slides.length) {
      const currentSlide = slides[selectedSlideIndex];
      if (currentSlide.type === 'text') {
        const height = currentSlide.settings?.slideHeight || 760;
        console.log(`[TEXT SLIDE DEBUG] Slide ${selectedSlideIndex + 1} - Height: ${height}px`);
      }
    }
  }, [selectedSlideIndex, slides]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea or contenteditable (Slate editor)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Check if user is inside a contenteditable element (Slate rich text editor)
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
        return;
      }

      // Ctrl+C / Cmd+C - copy slides (only when not editing text)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelectedSlides();
      }

      // Ctrl+V / Cmd+V - paste slides (only when not editing text)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && slideClipboard.slides.length > 0) {
        e.preventDefault();
        pasteSlides();
      }

      // Ctrl+D / Cmd+D - duplicate slides (only when not editing text)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedSlideIndices.size > 0) {
          duplicateSelectedSlides();
        } else {
          duplicateSlide(selectedSlideIndex);
        }
      }

      // Ctrl+A / Cmd+A - select all slides (only in multi-select mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && isMultiSelectMode) {
        e.preventDefault();
        selectAllSlides();
      }

      // Escape - cancel multi-select
      if (e.key === 'Escape' && (isMultiSelectMode || selectedSlideIndices.size > 0)) {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlideIndex, selectedSlideIndices, isMultiSelectMode, slides.length]);

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
          points: typeof slide.points === 'string' ? parseInt(slide.points) || 0 : slide.points || 0,
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
    } else if (type === 'matching') {
      // Calculate points based on pairs and pointsPerPair
      const matchingContent = defaultContent as { pairs?: any[]; pointsPerPair?: number };
      const pairs = matchingContent.pairs?.length || 0;
      const pointsPerPair = matchingContent.pointsPerPair || 1;
      defaultPoints = pairs * pointsPerPair;
    }
    
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      type,
      title: getDefaultTitle(type),
      content: defaultContent,
      settings: type === 'text' ? { slideHeight: 760 } : {},
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

  // Delete multiple slides at once
  const deleteSelectedSlides = () => {
    if (selectedSlideIndices.size === 0) return;
    
    const indicesToDelete = Array.from(selectedSlideIndices).sort((a, b) => b - a);
    const newSlides = slides.filter((_, i) => !selectedSlideIndices.has(i));
    
    setSlides(newSlides);
    setSelectedSlideIndices(new Set());
    setIsMultiSelectMode(false);
    
    if (newSlides.length === 0) {
      setSelectedSlideIndex(0);
    } else {
      setSelectedSlideIndex(Math.min(selectedSlideIndex, newSlides.length - 1));
    }
    
    toast({
      title: `${indicesToDelete.length} dia törölve`,
      description: 'A kiválasztott diák sikeresen törölve lettek.',
    });
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

  // Duplicate multiple slides at once
  const duplicateSelectedSlides = () => {
    if (selectedSlideIndices.size === 0) return;
    
    const indicesToDuplicate = Array.from(selectedSlideIndices).sort((a, b) => a - b);
    const newSlides = [...slides];
    
    indicesToDuplicate.forEach((index, i) => {
      const slide = slides[index];
      const newSlide = {
        ...JSON.parse(JSON.stringify(slide)), // Deep copy
        id: `slide-${Date.now()}-${i}`,
        sort_order: newSlides.length
      };
      newSlides.push(newSlide);
    });
    
    setSlides(newSlides);
    setSelectedSlideIndices(new Set());
    setIsMultiSelectMode(false);
    
    toast({
      title: `${indicesToDuplicate.length} dia duplikálva`,
      description: 'A kiválasztott diák sikeresen duplikálva lettek.',
    });
  };

  // Copy slides to clipboard
  const copySelectedSlides = () => {
    const indicesToCopy = selectedSlideIndices.size > 0 
      ? Array.from(selectedSlideIndices).sort((a, b) => a - b)
      : [selectedSlideIndex];
    
    const slidesToCopy = indicesToCopy.map(index => JSON.parse(JSON.stringify(slides[index])));
    slideClipboard.slides = slidesToCopy;
    slideClipboard.sourcePresentationId = presentationId;
    setClipboardCount(slidesToCopy.length);
    
    setSelectedSlideIndices(new Set());
    setIsMultiSelectMode(false);
    
    toast({
      title: `${slidesToCopy.length} dia másolva`,
      description: 'A diák a vágólapra kerültek. Beillesztheted ide vagy másik prezentációba.',
    });
  };

  // Paste slides from clipboard
  const pasteSlides = () => {
    if (slideClipboard.slides.length === 0) return;
    
    const newSlides = [...slides];
    const insertIndex = selectedSlideIndex + 1;
    
    slideClipboard.slides.forEach((slide, i) => {
      const newSlide = {
        ...JSON.parse(JSON.stringify(slide)),
        id: `slide-${Date.now()}-${i}`,
        sort_order: insertIndex + i
      };
      newSlides.splice(insertIndex + i, 0, newSlide);
    });
    
    // Update sort_order for all slides
    newSlides.forEach((slide, index) => {
      slide.sort_order = index;
    });
    
    setSlides(newSlides);
    setSelectedSlideIndex(insertIndex);
    
    toast({
      title: `${slideClipboard.slides.length} dia beillesztve`,
      description: slideClipboard.sourcePresentationId !== presentationId 
        ? 'Diák másik prezentációból beillesztve.' 
        : 'Diák sikeresen beillesztve.',
    });
  };

  // Toggle slide selection for multi-select
  const toggleSlideSelection = (index: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && selectedSlideIndices.size > 0) {
      // Shift+click: select range
      const lastSelected = Math.max(...Array.from(selectedSlideIndices));
      const start = Math.min(lastSelected, index);
      const end = Math.max(lastSelected, index);
      const newSelection = new Set(selectedSlideIndices);
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      setSelectedSlideIndices(newSelection);
    } else if (event?.ctrlKey || event?.metaKey) {
      // Ctrl/Cmd+click: toggle single
      const newSelection = new Set(selectedSlideIndices);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      setSelectedSlideIndices(newSelection);
    } else if (isMultiSelectMode) {
      // In multi-select mode, toggle single
      const newSelection = new Set(selectedSlideIndices);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      setSelectedSlideIndices(newSelection);
    }
  };

  // Select all slides
  const selectAllSlides = () => {
    const allIndices = new Set(slides.map((_, i) => i));
    setSelectedSlideIndices(allIndices);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSlideIndices(new Set());
    setIsMultiSelectMode(false);
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
    return slides.reduce((sum, slide) => sum + (typeof slide.points === 'string' ? parseInt(slide.points) || 0 : slide.points || 0), 0);
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

  // Get slide type display info
  const getSlideTypeInfo = (type: Slide['type']) => {
    const types: Record<string, { label: string; icon: any }> = {
      'heading': { label: 'Címsor', icon: Heading },
      'text': { label: 'Szöveg', icon: Type },
      'image': { label: 'Kép', icon: ImageIcon },
      'multiple_choice': { label: 'Feleletválasztós', icon: BarChart3 },
      'ranking': { label: 'Sorrendbe rakás', icon: ListOrdered },
      'matching': { label: 'Párosítás', icon: Link2 },
      'true_false': { label: 'Igaz/Hamis', icon: ToggleLeft },
      'fill_in_blanks': { label: 'Szöveg kiegészítés', icon: PenLine }
    };
    return types[type] || { label: type, icon: Type };
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header - Mentimeter style */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <Input
              value={presentation.title}
              onChange={(e) => setPresentation({ ...presentation, title: e.target.value })}
              className="text-lg font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Prezentáció címe"
            />
            <span className="text-xs text-gray-500">{slides.length} dia • {getTotalPoints()} pont</span>
          </div>
        </div>

        {/* Spacer to center the title */}
        <div />

        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-600"
            onClick={() => setIsPreviewMode(true)}
            disabled={slides.length === 0}
            title="Előnézet"
          >
            <Eye className="h-5 w-5" />
          </Button>
          <Button 
            onClick={saveAll} 
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mentés...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Mentés
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Slide Thumbnails */}
        <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-52'}`}>
          {/* Add New Slide Button */}
          <div className="p-3 border-b border-gray-200">
            <Select value="" onValueChange={(type) => {
              if (type) {
                addSlide(type as Slide['type']);
              }
            }}>
              <SelectTrigger className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 rounded-full">
                <div className="flex items-center justify-center w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-medium">Új dia</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heading">
                  <div className="flex items-center">
                    <Heading className="h-4 w-4 mr-2" />
                    Címsor
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center">
                    <Type className="h-4 w-4 mr-2" />
                    Szöveg
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Kép
                  </div>
                </SelectItem>
                <SelectItem value="multiple_choice">
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Feleletválasztós
                  </div>
                </SelectItem>
                <SelectItem value="ranking">
                  <div className="flex items-center">
                    <ListOrdered className="h-4 w-4 mr-2" />
                    Sorrendbe rakás
                  </div>
                </SelectItem>
                <SelectItem value="matching">
                  <div className="flex items-center">
                    <Link2 className="h-4 w-4 mr-2" />
                    Párosítás
                  </div>
                </SelectItem>
                <SelectItem value="true_false">
                  <div className="flex items-center">
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Igaz/Hamis
                  </div>
                </SelectItem>
                <SelectItem value="fill_in_blanks">
                  <div className="flex items-center">
                    <PenLine className="h-4 w-4 mr-2" />
                    Szöveg kiegészítés
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Multi-select Actions Bar */}
          {(isMultiSelectMode || selectedSlideIndices.size > 0) && (
            <div className="p-2 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-700">
                  {selectedSlideIndices.size} kiválasztva
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-gray-500"
                  onClick={clearSelection}
                >
                  <X className="h-3 w-3 mr-1" />
                  Mégse
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={selectAllSlides}
                >
                  Összes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={copySelectedSlides}
                  disabled={selectedSlideIndices.size === 0}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Másolás
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={duplicateSelectedSlides}
                  disabled={selectedSlideIndices.size === 0}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Duplikálás
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={deleteSelectedSlides}
                  disabled={selectedSlideIndices.size === 0}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Törlés
                </Button>
              </div>
            </div>
          )}

          {/* Slide Actions Row (when not in multi-select) */}
          {!isMultiSelectMode && selectedSlideIndices.size === 0 && (
            <div className="p-2 border-b border-gray-200 flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-gray-600"
                onClick={() => setIsMultiSelectMode(true)}
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                Kijelölés
              </Button>
              <div className="flex gap-1">
                {clipboardCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={pasteSlides}
                    title={`${clipboardCount} dia beillesztése`}
                  >
                    <ClipboardPaste className="h-3 w-3 mr-1" />
                    Beillesztés ({clipboardCount})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Slide Thumbnails */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((slide, index) => {
              const typeInfo = getSlideTypeInfo(slide.type);
              const TypeIcon = typeInfo.icon;
              const isSelected = selectedSlideIndices.has(index);
              return (
                <div
                  key={slide.id}
                  className={`relative group cursor-pointer rounded-lg transition-all ${
                    isSelected 
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : selectedSlideIndex === index 
                        ? 'ring-2 ring-purple-500' 
                        : 'hover:ring-2 hover:ring-gray-300'
                  }`}
                  onClick={(e) => {
                    if (isMultiSelectMode || e.ctrlKey || e.metaKey || e.shiftKey) {
                      toggleSlideSelection(index, e);
                    } else {
                      setSelectedSlideIndex(index);
                    }
                  }}
                >
                  {/* Multi-select checkbox */}
                  {(isMultiSelectMode || selectedSlideIndices.size > 0) && (
                    <div 
                      className="absolute -left-1 top-1 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSlideSelection(index);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  )}

                  {/* Slide number */}
                  <div className={`absolute top-2 text-xs text-gray-400 font-medium ${(isMultiSelectMode || selectedSlideIndices.size > 0) ? 'left-4' : '-left-1'}`}>
                    {index + 1}
                  </div>
                  
                  {/* Thumbnail */}
                  <div 
                    className={`aspect-[16/9] bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center relative ${(isMultiSelectMode || selectedSlideIndices.size > 0) ? 'ml-8' : 'ml-4'}`}
                    style={{ backgroundColor: slide.backgroundColor || '#ffffff' }}
                  >
                    <TypeIcon className="h-6 w-6 text-gray-400" />
                    
                    {/* Points badge */}
                    {(typeof slide.points === 'string' ? parseInt(slide.points) || 0 : slide.points || 0) > 0 && (
                      <div className="absolute bottom-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {slide.points}p
                      </div>
                    )}
                  </div>
                  
                  {/* Hover actions */}
                  {!isMultiSelectMode && selectedSlideIndices.size === 0 && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-white shadow-sm rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(index, Math.max(0, index - 1));
                        }}
                        disabled={index === 0}
                        title="Fel"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-white shadow-sm rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(index, Math.min(slides.length - 1, index + 1));
                        }}
                        disabled={index === slides.length - 1}
                        title="Le"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Context menu actions on right side */}
                  {!isMultiSelectMode && selectedSlideIndices.size === 0 && (
                    <div className="absolute right-0 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 bg-white/80 shadow-sm rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateSlide(index);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Duplikálás
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSlideIndex(index);
                              const singleSlide = [JSON.parse(JSON.stringify(slides[index]))];
                              slideClipboard.slides = singleSlide;
                              slideClipboard.sourcePresentationId = presentationId;
                              setClipboardCount(1);
                              toast({
                                title: 'Dia másolva',
                                description: 'A dia a vágólapra került.',
                              });
                            }}
                          >
                            <Clipboard className="h-3 w-3 mr-2" />
                            Másolás
                          </Button>
                          <div className="h-px bg-gray-200 my-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSlide(index);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Törlés
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Toggle Left Sidebar Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 rounded-r-lg p-1 hover:bg-gray-50 shadow-sm"
          style={{ left: isSidebarCollapsed ? '0' : '208px' }}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </button>

        {/* Center - Slide Canvas/Preview or Editor */}
        <div className="flex-1 overflow-auto bg-gray-100 flex flex-col">
          {selectedSlide ? (
            <>
              {/* For text-based slides, show scaled inline editor with same dimensions as preview */}
              {(selectedSlide.type === 'text' || selectedSlide.type === 'fill_in_blanks') ? (
                <div className="flex-1 flex flex-col min-h-0 p-6 overflow-auto">
                  {/* Scaled editor container */}
                  <div className="flex items-start justify-center">
                    <div className="relative w-full max-w-5xl">
                      {/* Slide container - dynamic height for text slides */}
                      <div 
                        className="relative rounded-lg shadow-lg overflow-visible"
                      >
                          <ScaledSlideEditor 
                            slide={selectedSlide} 
                            theme={presentation.theme}
                            onContentChange={(content) => {
                              const inputFieldPoints = calculateInputFieldPoints(content);
                              if (selectedSlide.type === 'text') {
                                updateSlide(selectedSlideIndex, { 
                                  content,
                                  points: inputFieldPoints
                                });
                              } else {
                                updateSlide(selectedSlideIndex, { 
                                  content: { ...selectedSlide.content, content },
                                  points: inputFieldPoints
                                });
                              }
                            }}
                            onBlanksChange={selectedSlide.type === 'fill_in_blanks' ? (blanks) => updateSlide(selectedSlideIndex, { 
                              content: { ...selectedSlide.content, blanks } 
                            }) : undefined}
                            onHeightChange={selectedSlide.type === 'text' ? (height) => updateSlide(selectedSlideIndex, { 
                              settings: { ...selectedSlide.settings, slideHeight: height } 
                            }) : undefined}
                          />
                      </div>
                      
                      {/* Slide actions overlay */}
                      <div className="absolute bottom-4 right-4 flex items-center space-x-2 opacity-0 hover:opacity-100 transition-opacity z-10">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-white/90 shadow-sm"
                            >
                              <Palette className="h-3 w-3 mr-1" />
                              Háttér
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <SketchPicker
                              color={selectedSlide.backgroundColor || presentation.theme?.background || '#ffffff'}
                              onChange={(color) => updateSlide(selectedSlideIndex, { backgroundColor: color.hex })}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/90 shadow-sm"
                          onClick={() => duplicateSlide(selectedSlideIndex)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Másolás
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/90 shadow-sm text-red-600 hover:text-red-700"
                          onClick={() => deleteSlide(selectedSlideIndex)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Törlés
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* For non-text slides, show scaled preview */
                <div className="flex-1 p-6 flex items-center justify-center">
                  <div className="relative w-full max-w-5xl">
                    {/* Slide container with exact 16:9 aspect ratio */}
                    <div 
                      className="relative rounded-lg shadow-lg overflow-hidden"
                      style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}
                    >
                      <div className="absolute inset-0">
                        <ScaledSlidePreview slide={selectedSlide} theme={presentation.theme} />
                      </div>
                    </div>
                    
                    {/* Slide actions overlay */}
                    <div className="absolute bottom-4 right-4 flex items-center space-x-2 opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 shadow-sm"
                        onClick={() => duplicateSlide(selectedSlideIndex)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Másolás
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 shadow-sm text-red-600 hover:text-red-700"
                        onClick={() => deleteSlide(selectedSlideIndex)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Törlés
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 p-6 flex items-center justify-center">
              <div className="w-full max-w-4xl">
                <div 
                  className="relative bg-white rounded-lg shadow-lg overflow-hidden"
                  style={{ paddingBottom: '56.25%' }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Type className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Még nincsenek diák</h3>
                      <p className="text-gray-500 mb-4">Hozd létre az első diádat a kezdéshez.</p>
                      <Select value="" onValueChange={(type) => {
                        if (type) {
                          addSlide(type as Slide['type']);
                        }
                      }}>
                        <SelectTrigger className="w-48 mx-auto">
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
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Settings Panel */}
        <div 
          className={`bg-white border-l border-gray-200 flex relative ${isResizingRightPanel ? '' : 'transition-all duration-300'}`}
          style={{ width: isRightPanelCollapsed ? '56px' : `${rightPanelWidth}px` }}
        >
          {/* Resize handle */}
          {!isRightPanelCollapsed && (
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-400 transition-colors z-10 ${isResizingRightPanel ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-300'}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingRightPanel(true);
                const startX = e.clientX;
                const startWidth = rightPanelWidth;
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaX = startX - moveEvent.clientX;
                  const newWidth = Math.min(800, Math.max(280, startWidth + deltaX));
                  setRightPanelWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  setIsResizingRightPanel(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          )}
          {/* Settings Content */}
          {!isRightPanelCollapsed && (
            <div className="flex-1 overflow-y-auto">
              {/* Edit Tab Content */}
              {activeRightTab === 'edit' && selectedSlide && (
                <>
                  {/* Panel Header */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Dia szerkesztése</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setIsRightPanelCollapsed(true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Slide Type Selector */}
                  <div className="p-4 border-b border-gray-200">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Dia típus</label>
                    <Select 
                      value={selectedSlide.type}
                      onValueChange={(type) => {
                        updateSlide(selectedSlideIndex, { 
                          type: type as Slide['type'],
                          content: getDefaultContent(type as Slide['type']),
                          title: getDefaultTitle(type as Slide['type'])
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="heading">
                          <div className="flex items-center">
                            <Heading className="h-4 w-4 mr-2 text-purple-500" />
                            Címsor
                          </div>
                        </SelectItem>
                        <SelectItem value="text">
                          <div className="flex items-center">
                            <Type className="h-4 w-4 mr-2 text-blue-500" />
                            Szöveg
                          </div>
                        </SelectItem>
                        <SelectItem value="image">
                          <div className="flex items-center">
                            <ImageIcon className="h-4 w-4 mr-2 text-green-500" />
                            Kép
                          </div>
                        </SelectItem>
                        <SelectItem value="multiple_choice">
                          <div className="flex items-center">
                            <BarChart3 className="h-4 w-4 mr-2 text-orange-500" />
                            Feleletválasztós
                          </div>
                        </SelectItem>
                        <SelectItem value="ranking">
                          <div className="flex items-center">
                            <ListOrdered className="h-4 w-4 mr-2 text-yellow-600" />
                            Sorrendbe rakás
                          </div>
                        </SelectItem>
                        <SelectItem value="matching">
                          <div className="flex items-center">
                            <Link2 className="h-4 w-4 mr-2 text-pink-500" />
                            Párosítás
                          </div>
                        </SelectItem>
                        <SelectItem value="true_false">
                          <div className="flex items-center">
                            <ToggleLeft className="h-4 w-4 mr-2 text-cyan-500" />
                            Igaz/Hamis
                          </div>
                        </SelectItem>
                        <SelectItem value="fill_in_blanks">
                          <div className="flex items-center">
                            <PenLine className="h-4 w-4 mr-2 text-indigo-500" />
                            Szöveg kiegészítés
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Slide Editor Content */}
                  <div className="p-4">
                    <SlideEditorPanel
                      slide={selectedSlide}
                      onChange={(updates) => updateSlide(selectedSlideIndex, updates)}
                      theme={presentation.theme}
                    />
                  </div>

                  {/* Background Section */}
                  <div className="p-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Háttér</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Háttérszín</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-10 h-10 p-0 rounded-lg"
                              style={{ backgroundColor: selectedSlide.backgroundColor || presentation.theme?.background || '#ffffff' }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <SketchPicker
                              color={selectedSlide.backgroundColor || presentation.theme?.background || '#ffffff'}
                              onChange={(color) => updateSlide(selectedSlideIndex, { backgroundColor: color.hex })}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Settings Tab Content */}
              {activeRightTab === 'settings' && (
                <>
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Prezentáció beállítások</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setIsRightPanelCollapsed(true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Presentation Title */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Prezentáció címe</Label>
                      <Input
                        value={presentation.title}
                        onChange={(e) => setPresentation(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-1"
                        placeholder="Prezentáció címe"
                      />
                    </div>

                    {/* Presentation Description */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Leírás</Label>
                      <Textarea
                        value={presentation.description || ''}
                        onChange={(e) => setPresentation(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                        placeholder="Prezentáció rövid leírása"
                        rows={3}
                      />
                    </div>

                    {/* Status Setting */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Státusz</Label>
                      <Select
                        value={presentation.status || 'draft'}
                        onValueChange={(value) => setPresentation(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Piszkozat</SelectItem>
                          <SelectItem value="published">Nyilvános</SelectItem>
                          <SelectItem value="archived">Archiválva</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        {presentation.status === 'published' 
                          ? 'Mindenki láthatja a prezentációt' 
                          : presentation.status === 'archived'
                            ? 'A prezentáció archiválva van'
                            : 'A prezentáció még piszkozat'}
                      </p>
                    </div>

                    {/* Default Text Color */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Alapértelmezett szövegszín</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-10 h-10 p-0 rounded-lg"
                              style={{ backgroundColor: presentation.theme?.textColor || '#000000' }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <SketchPicker
                              color={presentation.theme?.textColor || '#000000'}
                              onChange={(color) => setPresentation(prev => ({ 
                                ...prev, 
                                theme: { ...prev.theme, textColor: color.hex } 
                              }))}
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-sm text-gray-600">{presentation.theme?.textColor || '#000000'}</span>
                      </div>
                    </div>

                    {/* Default Background Color */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Alapértelmezett háttérszín</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-10 h-10 p-0 rounded-lg"
                              style={{ backgroundColor: presentation.theme?.background || '#ffffff' }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <SketchPicker
                              color={presentation.theme?.background || '#ffffff'}
                              onChange={(color) => setPresentation(prev => ({ 
                                ...prev, 
                                theme: { ...prev.theme, background: color.hex } 
                              }))}
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-sm text-gray-600">{presentation.theme?.background || '#ffffff'}</span>
                      </div>
                    </div>

                    {/* Show Answers After Completion */}
                    <div className="pt-4 border-t border-gray-200">
                      <Label className="text-sm font-medium text-gray-700">Eredmények beállításai</Label>
                      
                      {/* Show Points Toggle */}
                      <div className="flex items-center gap-3 mt-3">
                        <Checkbox
                          id="showPoints"
                          checked={presentation.settings?.showPoints ?? true}
                          onCheckedChange={(checked) => setPresentation(prev => ({
                            ...prev,
                            settings: { ...prev.settings, showPoints: checked }
                          }))}
                        />
                        <div>
                          <Label htmlFor="showPoints" className="text-sm text-gray-600">
                            Pontszám megjelenítése
                          </Label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Ha kikapcsolod, motivációs üzenet jelenik meg helyette
                          </p>
                        </div>
                      </div>

                      {/* Show Answers Toggle */}
                      <div className="flex items-center gap-3 mt-3">
                        <Checkbox
                          id="showAnswersAfterCompletion"
                          checked={presentation.settings?.showAnswersAfterCompletion ?? false}
                          onCheckedChange={(checked) => setPresentation(prev => ({
                            ...prev,
                            settings: { ...prev.settings, showAnswersAfterCompletion: checked }
                          }))}
                        />
                        <div>
                          <Label htmlFor="showAnswersAfterCompletion" className="text-sm text-gray-600">
                            Helyes válaszok mutatása befejezés után
                          </Label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            A tananyag végén a diákok megnézhetik a helyes válaszokat
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Show prompt when no slide selected on edit tab */}
              {activeRightTab === 'edit' && !selectedSlide && (
                <div className="p-4">
                  <div className="text-center py-8 text-gray-500">
                    <Type className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Válassz ki egy diát a szerkesztéshez</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Tab Bar - Mentimeter style vertical toolbar */}
          <div className="w-14 border-l border-gray-200 bg-gray-50 flex flex-col items-center py-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg ${
                activeRightTab === 'edit' && !isRightPanelCollapsed ? 'bg-white shadow-sm' : ''
              }`}
              onClick={() => {
                setActiveRightTab('edit');
                setIsRightPanelCollapsed(false);
              }}
            >
              <Edit3 className="h-5 w-5 mb-1" />
              <span className="text-[10px]">Szerk.</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg ${
                activeRightTab === 'settings' && !isRightPanelCollapsed ? 'bg-white shadow-sm' : ''
              }`}
              onClick={() => {
                setActiveRightTab('settings');
                setIsRightPanelCollapsed(false);
              }}
            >
              <SlidersHorizontal className="h-5 w-5 mb-1" />
              <span className="text-[10px]">Beáll.</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide Preview Content Component
function SlidePreviewContent({ slide, theme }: { slide: Slide; theme: any }) {
  switch (slide.type) {
    case 'heading':
      return (
        <div className="text-center">
          <h1 
            className="font-bold mb-2"
            style={{ 
              color: slide.content?.textColor || theme?.textColor || '#000000',
              fontSize: slide.content?.fontSize || '48px',
              fontFamily: slide.content?.fontFamily || 'Inter'
            }}
          >
            {slide.content?.text || 'Címsor'}
          </h1>
          {slide.content?.subtitle && (
            <p 
              style={{ 
                color: slide.content?.subtitleColor || '#666666',
                fontSize: slide.content?.subtitleFontSize || '24px',
                fontFamily: slide.content?.subtitleFontFamily || 'Inter'
              }}
            >
              {slide.content.subtitle}
            </p>
          )}
        </div>
      );
    case 'text':
      return (
        <div className="w-full h-full overflow-auto">
          <RichTextRenderer content={slide.content} />
        </div>
      );
    case 'image':
      return (
        <div className="text-center">
          {slide.content?.url ? (
            <>
              <img 
                src={slide.content.url} 
                alt={slide.content.caption || ''} 
                className="max-w-full max-h-[60%] mx-auto object-contain rounded-lg"
              />
              {slide.content.caption && (
                <p className="text-gray-600 mt-2 text-sm">{slide.content.caption}</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <ImagePlus className="h-16 w-16 mb-2" />
              <span>Kép hozzáadása</span>
            </div>
          )}
        </div>
      );
    case 'multiple_choice':
      return (
        <div className="w-full">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: slide.content?.questionColor || '#000000' }}>
            <MathText text={slide.content?.question || 'Kérdés'} />
          </h2>
          <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
            {(slide.content?.options || []).slice(0, 4).map((option: any, index: number) => (
              <div 
                key={index} 
                className="p-3 rounded-lg text-center text-sm border-2"
                style={{ 
                  color: option.textColor || '#000000',
                  backgroundColor: option.bgColor || '#ffffff',
                  borderColor: option.borderColor || '#d1d5db',
                }}
              >
                <MathText text={option.text || option} />
              </div>
            ))}
          </div>
        </div>
      );
    case 'ranking':
      return (
        <div className="w-full">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: slide.content?.questionColor || '#000000' }}>
            <MathText text={slide.content?.question || 'Rakd sorrendbe'} />
          </h2>
          <div className="space-y-2 max-w-md mx-auto">
            {(slide.content?.items || []).slice(0, 4).map((item: any, index: number) => (
              <div 
                key={index} 
                className="p-3 rounded-lg text-sm border-2 flex items-center"
                style={{ 
                  color: item.textColor || '#000000',
                  backgroundColor: item.bgColor || '#ffffff',
                  borderColor: item.borderColor || '#d1d5db',
                }}
              >
                <span className="font-bold mr-3">{index + 1}.</span>
                <MathText text={item.text || item} />
              </div>
            ))}
          </div>
        </div>
      );
    case 'matching':
      return (
        <div className="w-full">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: slide.content?.questionColor || '#000000' }}>
            <MathText text={slide.content?.question || 'Párosítsd össze'} />
          </h2>
          <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="space-y-2">
              {(slide.content?.pairs || []).slice(0, 3).map((pair: any, index: number) => (
                <div key={index} className="p-2 rounded-lg text-sm border-2 text-center" style={{ backgroundColor: pair.leftColor || '#ffffff' }}>
                  <MathText text={pair.left} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {(slide.content?.pairs || []).slice(0, 3).map((pair: any, index: number) => (
                <div key={index} className="p-2 rounded-lg text-sm border-2 border-dashed text-center" style={{ backgroundColor: pair.rightColor || '#ffffff' }}>
                  <MathText text={pair.right} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'true_false':
      return (
        <div className="w-full text-center">
          <h2 className="text-2xl font-bold mb-8" style={{ color: slide.content?.statementColor || '#000000' }}>
            <MathText text={slide.content?.statement || 'Állítás'} />
          </h2>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50">
              <span className="text-xl font-bold text-green-600">IGAZ</span>
            </div>
            <div className="p-4 rounded-lg border-2 border-red-500 bg-red-50">
              <span className="text-xl font-bold text-red-600">HAMIS</span>
            </div>
          </div>
        </div>
      );
    case 'fill_in_blanks':
      return (
        <div className="w-full">
          <div className="text-lg leading-relaxed">
            <RichTextRenderer content={slide.content?.content || []} />
          </div>
        </div>
      );
    default:
      return (
        <div className="text-center text-gray-400">
          <Type className="h-12 w-12 mx-auto mb-2" />
          <span>Dia előnézet</span>
        </div>
      );
  }
}

// Scaled Slide Preview Component - Renders the slide at full size and scales it down
function ScaledSlidePreview({ slide, theme }: { slide: Slide; theme: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          const parentWidth = parent.offsetWidth;
          const newScale = parentWidth / 1600;
          setScale(newScale);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    // Use ResizeObserver for more accurate tracking
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, []);

  const backgroundColor = slide.backgroundColor || theme?.background || '#ffffff';
  const textColor = slide.textColor || theme?.textColor || '#000000';
  
  // Check if background is a gradient
  const isGradient = backgroundColor.includes('gradient');
  const backgroundStyle = isGradient 
    ? { background: backgroundColor }
    : { backgroundColor };

  // Get stored height for text slides
  const slideHeight = slide.settings?.slideHeight || 760;
  const needsScroll = slide.type === 'text' && slideHeight > 760;

  // Calculate the scaled height for proper container sizing
  const scaledHeight = slideHeight * scale;

  // For text slides, use same structure as viewer's ScaledTextSlideContent
  if (slide.type === 'text') {
    return (
      <div 
        className="w-full h-full"
        style={{
          // Only allow vertical scrolling, never horizontal
          overflowX: 'hidden',
          overflowY: needsScroll ? 'auto' : 'hidden',
          scrollbarGutter: 'stable',
        }}
      >
        <style>{`
          .preview-scroll-container::-webkit-scrollbar {
            width: 8px;
          }
          .preview-scroll-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .preview-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }
          .preview-scroll-container::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.3);
          }
        `}</style>
        <div 
          ref={containerRef}
          className="origin-top-left preview-scroll-container"
          style={{
            width: '1600px',
            height: `${slideHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            ...backgroundStyle,
            color: textColor,
          }}
        >
          <div className="w-full p-8 overflow-visible relative" style={{ paddingRight: '24px' }}>
            <RichTextRenderer content={slide.content} />
          </div>
        </div>
      </div>
    );
  }

  // Other slide types
  return (
    <div 
      ref={containerRef}
      className="origin-top-left"
      style={{
        width: '1600px',
        height: '900px',
        transform: `scale(${scale})`,
      }}
    >
      <div 
        className="w-full h-full flex flex-col items-center justify-center"
        style={{ 
          ...backgroundStyle,
          color: textColor,
        }}
      >
        {slide.type === 'heading' && (
          <div className="text-center px-16">
            <h1
              className="font-bold mb-4"
              style={{ 
                color: slide.content?.textColor || textColor,
                fontSize: slide.content?.fontSize || '48px',
                fontFamily: slide.content?.fontFamily || 'Inter'
              }}
            >
              {slide.content?.text || 'Címsor'}
            </h1>
            {slide.content?.subtitle && (
              <p
                style={{ 
                  color: slide.content?.subtitleColor || '#666666',
                  fontSize: slide.content?.subtitleFontSize || '24px',
                  fontFamily: slide.content?.subtitleFontFamily || 'Inter'
                }}
              >
                {slide.content.subtitle}
              </p>
            )}
          </div>
        )}

            {slide.type === 'image' && (
          <div className="text-center px-16">
            {slide.content?.url ? (
              <>
                <img 
                  src={slide.content.url} 
                  alt={slide.content.caption || ''} 
                  className="max-w-full max-h-[700px] mx-auto object-contain rounded-lg"
                />
                {slide.content.caption && (
                  <p className="text-gray-600 mt-4 text-xl">{slide.content.caption}</p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <ImagePlus className="h-24 w-24 mb-4" />
                <span className="text-2xl">Kép hozzáadása</span>
              </div>
            )}
          </div>
        )}

        {slide.type === 'multiple_choice' && (
          <div className="w-full px-16">
            <h2 className="text-4xl font-bold mb-12 text-center" style={{ color: slide.content?.questionColor || textColor }}>
              <MathText text={slide.content?.question || 'Kérdés'} />
            </h2>
            <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
              {(slide.content?.options || []).map((option: any, index: number) => (
                <div 
                  key={index} 
                  className="p-6 rounded-xl text-center text-xl font-medium border-2"
                  style={{ 
                    color: option.textColor || textColor,
                    backgroundColor: option.bgColor || '#ffffff',
                    borderColor: option.borderColor || '#d1d5db',
                  }}
                >
                  <MathText text={option.text || option} />
                </div>
              ))}
            </div>
          </div>
        )}

        {slide.type === 'ranking' && (
          <div className="w-full px-16">
            <h2 className="text-4xl font-bold mb-12 text-center" style={{ color: slide.content?.questionColor || textColor }}>
              <MathText text={slide.content?.question || 'Rakd sorrendbe'} />
            </h2>
            <div className="space-y-4 max-w-2xl mx-auto">
              {(slide.content?.items || []).map((item: any, index: number) => (
                <div 
                  key={index} 
                  className="p-5 rounded-xl text-xl font-medium border-2 flex items-center"
                  style={{ 
                    color: item.textColor || textColor,
                    backgroundColor: item.bgColor || '#ffffff',
                    borderColor: item.borderColor || '#d1d5db',
                  }}
                >
                  <span className="font-bold mr-4 text-2xl">{index + 1}.</span>
                  <MathText text={item.text || item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {slide.type === 'matching' && (
          <div className="w-full px-16">
            <h2 className="text-4xl font-bold mb-12 text-center" style={{ color: slide.content?.questionColor || textColor }}>
              <MathText text={slide.content?.question || 'Párosítsd össze'} />
            </h2>
            <div className="grid grid-cols-2 gap-12 max-w-4xl mx-auto">
              <div className="space-y-4">
                {(slide.content?.pairs || []).map((pair: any, index: number) => (
                  <div key={index} className="p-4 rounded-xl text-xl font-medium border-2 text-center" style={{ backgroundColor: pair.leftColor || '#ffffff' }}>
                    <MathText text={pair.left} />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {(slide.content?.pairs || []).map((pair: any, index: number) => (
                  <div key={index} className="p-4 rounded-xl text-xl font-medium border-2 border-dashed text-center" style={{ backgroundColor: pair.rightColor || '#ffffff' }}>
                    <MathText text={pair.right} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {slide.type === 'true_false' && (
          <div className="w-full text-center px-16">
            <h2 className="text-4xl font-bold mb-16" style={{ color: slide.content?.statementColor || textColor }}>
              <MathText text={slide.content?.statement || 'Állítás'} />
            </h2>
            <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div className="p-8 rounded-xl border-4 border-green-500 bg-green-50">
                <span className="text-3xl font-bold text-green-600">IGAZ</span>
              </div>
              <div className="p-8 rounded-xl border-4 border-red-500 bg-red-50">
                <span className="text-3xl font-bold text-red-600">HAMIS</span>
              </div>
            </div>
          </div>
        )}

        {slide.type === 'fill_in_blanks' && (
          <div className="w-full px-16">
            <div className="text-2xl leading-relaxed">
              <RichTextRenderer content={slide.content?.content || []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Scaled Slide Editor Component - Renders the editor at full size (1600x900) and scales it down
function ScaledSlideEditor({ 
  slide, 
  theme, 
  onContentChange,
  onBlanksChange,
  onHeightChange
}: { 
  slide: Slide; 
  theme: any;
  onContentChange: (content: any) => void;
  onBlanksChange?: (blanks: any[]) => void;
  onHeightChange?: (height: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isResizing, setIsResizing] = useState(false);
  
  // Get stored height or default to 760
  const slideHeight = slide.settings?.slideHeight || 760;

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current) {
        // Get the parent of the wrapper (which is the flex container)
        const parent = wrapperRef.current.parentElement;
        if (parent) {
          const parentWidth = parent.offsetWidth;
          const newScale = parentWidth / 1600;
          setScale(newScale);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (wrapperRef.current?.parentElement) {
      resizeObserver.observe(wrapperRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, []);

  // Handle resize drag for text slides
  const handleResizeStart = (e: React.MouseEvent) => {
    if (slide.type !== 'text') return;
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = slideHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = (moveEvent.clientY - startY) / scale;
      const newHeight = Math.max(400, Math.round(startHeight + deltaY));
      if (onHeightChange) {
        onHeightChange(newHeight);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const backgroundColor = slide.backgroundColor || theme?.background || '#ffffff';
  const textColor = slide.textColor || theme?.textColor || '#000000';
  
  const isGradient = backgroundColor.includes('gradient');
  const backgroundStyle = isGradient 
    ? { background: backgroundColor }
    : { backgroundColor };

  const content = slide.type === 'text' ? slide.content : (slide.content?.content || []);

  // For text slides, use variable height
  const effectiveHeight = slide.type === 'text' ? slideHeight : 900;

  // Calculate the scaled dimensions for the wrapper
  const scaledWidth = 1600 * scale;
  const scaledHeight = effectiveHeight * scale;

  // Toolbar height (approximate) - needed for positioning above the slide
  const toolbarHeight = 72; // Approximate height of the editor toolbar

  return (
    <div 
      ref={wrapperRef}
      className="relative"
      style={{ 
        width: '100%',
        maxWidth: `${scaledWidth}px`,
        marginTop: `${toolbarHeight}px`, // Space for toolbar above
        paddingBottom: slide.type === 'text' ? '12px' : undefined, // Space for resize handle
      }}
    >
      <div 
        className="origin-top-left overflow-visible"
        style={{
          width: '1600px',
          minHeight: `${effectiveHeight}px`,
          transform: `scale(${scale})`,
        }}
      >
        <div 
          className="w-full h-full"
          style={{ 
            ...backgroundStyle,
            color: textColor,
            minHeight: `${effectiveHeight}px`,
          }}
        >
          {/* Full-size editor that will be scaled down */}
          <RichTextEditor
            content={content as Descendant[]}
            onChange={onContentChange}
            enableDragBlanks={slide.type === 'fill_in_blanks'}
            blanks={slide.type === 'fill_in_blanks' ? (slide.content?.blanks || []) : undefined}
            onBlanksChange={onBlanksChange}
          />
        </div>
      </div>
      
      {/* Resize handle for text slides */}
      {slide.type === 'text' && (
        <div
          className={`absolute left-0 h-3 cursor-ns-resize flex items-center justify-center group transition-colors ${
            isResizing ? 'bg-blue-200' : 'hover:bg-blue-100'
          }`}
          style={{ 
            top: `${scaledHeight}px`,
            width: `${scaledWidth}px`,
          }}
          onMouseDown={handleResizeStart}
        >
          <div className={`w-16 h-1 rounded-full transition-colors ${
            isResizing ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-blue-400'
          }`} />
        </div>
      )}
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

// Slide Editor Panel Component (Right sidebar content editor)
function SlideEditorPanel({ slide, onChange, theme }: { slide: Slide; onChange: (updates: Partial<Slide>) => void; theme: any }) {
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  return (
    <div className="space-y-4">
      {/* Slide Title */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Dia címe</Label>
        <Input
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* For text slides, show a message since the editor is in the center */}
      {slide.type === 'text' && (
        <>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Tipp:</span> A szöveg szerkesztéséhez kattints a középső területre.
            </p>
          </div>
          
          {/* Reset slide height button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full mt-3 border-red-300 text-red-600 hover:bg-red-50"
              >
                Magasság visszaállítása
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Dia magasság alaphelyzetbe állítása?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ez visszaállítja a dia magasságát az alapértelmezett 760 pixelre. Ez a művelet visszavonhatatlan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2 justify-end mt-4">
                <AlertDialogCancel>Mégse</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onChange({ settings: { ...slide.settings, slideHeight: 760 } })}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Alaphelyzetbe állítás
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* For fill_in_blanks slides, show a message since the editor is in the center */}
      {slide.type === 'fill_in_blanks' && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Tipp:</span> A tartalom szerkesztéséhez kattints a középső területre.
          </p>
        </div>
      )}

      {slide.type === 'heading' && (
        <>
          {/* Main Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Címsor</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    style={{ backgroundColor: slide.content.textColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <SketchPicker
                    color={slide.content.textColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, textColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Input
              value={slide.content.text || ''}
              onChange={(e) => onChange({ content: { ...slide.content, text: e.target.value } })}
              className="text-lg font-semibold"
              placeholder="Címsor szövege"
            />
            <div className="flex gap-2">
              <Select 
                value={slide.content.fontSize || '48px'} 
                onValueChange={(value) => onChange({ content: { ...slide.content, fontSize: value } })}
              >
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="Méret" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24px">24px</SelectItem>
                  <SelectItem value="32px">32px</SelectItem>
                  <SelectItem value="36px">36px</SelectItem>
                  <SelectItem value="48px">48px</SelectItem>
                  <SelectItem value="56px">56px</SelectItem>
                  <SelectItem value="64px">64px</SelectItem>
                  <SelectItem value="72px">72px</SelectItem>
                  <SelectItem value="80px">80px</SelectItem>
                  <SelectItem value="96px">96px</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={slide.content.fontFamily || 'Inter'} 
                onValueChange={(value) => onChange({ content: { ...slide.content, fontFamily: value } })}
              >
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="Betűtípus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Alcím</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    style={{ backgroundColor: slide.content.subtitleColor || theme?.textColor || '#666666' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <SketchPicker
                    color={slide.content.subtitleColor || theme?.textColor || '#666666'}
                    onChange={(color) => onChange({ content: { ...slide.content, subtitleColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Input
              value={slide.content.subtitle || ''}
              onChange={(e) => onChange({ content: { ...slide.content, subtitle: e.target.value } })}
              placeholder="Alcím szövege (opcionális)"
            />
            <div className="flex gap-2">
              <Select 
                value={slide.content.subtitleFontSize || '24px'} 
                onValueChange={(value) => onChange({ content: { ...slide.content, subtitleFontSize: value } })}
              >
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="Méret" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16px">16px</SelectItem>
                  <SelectItem value="18px">18px</SelectItem>
                  <SelectItem value="20px">20px</SelectItem>
                  <SelectItem value="24px">24px</SelectItem>
                  <SelectItem value="28px">28px</SelectItem>
                  <SelectItem value="32px">32px</SelectItem>
                  <SelectItem value="36px">36px</SelectItem>
                  <SelectItem value="40px">40px</SelectItem>
                  <SelectItem value="48px">48px</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={slide.content.subtitleFontFamily || 'Inter'} 
                onValueChange={(value) => onChange({ content: { ...slide.content, subtitleFontFamily: value } })}
              >
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="Betűtípus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {slide.type === 'image' && (
        <>
          {/* Image Section - Mentimeter style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Kép</Label>
            <p className="text-xs text-gray-500">Támogatott formátumok: png, gif, jpg, jpeg és svg</p>
            
            {/* Image Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer">
              <div className="flex flex-col items-center space-y-2">
                <ImagePlus className="h-8 w-8 text-gray-400" />
                <div className="text-sm">
                  <span className="text-gray-600">Húzd ide vagy </span>
                  <span className="text-purple-600 hover:underline">kattints a feltöltéshez</span>
                </div>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">vagy adj meg URL-t</Label>
              <Input
                value={slide.content.url || ''}
                onChange={(e) => onChange({ content: { ...slide.content, url: e.target.value } })}
                placeholder="https://..."
                className="text-sm"
              />
            </div>
          </div>
          
          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Képaláírás</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    style={{ backgroundColor: slide.content.captionColor || '#666666' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <SketchPicker
                    color={slide.content.captionColor || '#666666'}
                    onChange={(color) => onChange({ content: { ...slide.content, captionColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Input
              value={slide.content.caption || ''}
              onChange={(e) => onChange({ content: { ...slide.content, caption: e.target.value } })}
              placeholder="Képaláírás (opcionális)"
            />
          </div>
        </>
      )}

      {slide.type === 'multiple_choice' && (
        <>
          {/* Question Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Kérdés</Label>
              <div className="flex items-center space-x-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Matematikai kifejezés">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                      style={{ backgroundColor: slide.content.questionColor || theme?.textColor || '#000000' }}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <SketchPicker
                      color={slide.content.questionColor || theme?.textColor || '#000000'}
                      onChange={(color) => onChange({ content: { ...slide.content, questionColor: color.hex } })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Textarea
              value={slide.content.question || ''}
              onChange={(e) => onChange({ content: { ...slide.content, question: e.target.value } })}
              rows={2}
              placeholder="Írd ide a kérdést..."
              className="resize-none"
            />
          </div>

          {/* Multiple correct toggle */}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="multipleCorrect"
              checked={slide.content.multipleCorrect || false}
              onCheckedChange={(checked) => onChange({ 
                content: { ...slide.content, multipleCorrect: checked },
                correct_answer: checked ? [] : 0
              })}
            />
            <Label htmlFor="multipleCorrect" className="text-sm text-gray-600">Több helyes válasz</Label>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Válaszlehetőségek</Label>
            {(slide.content.options || []).map((option: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-2 space-y-2 hover:border-purple-300 transition-colors">
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
                    className="flex-1 h-8 text-sm"
                    placeholder={`${index + 1}. válasz`}
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Matematikai kifejezés">
                        <Sigma className="h-3 w-3" />
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
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    onClick={() => {
                      const newOptions = slide.content.options.filter((_: any, i: number) => i !== index);
                      onChange({ content: { ...slide.content, options: newOptions } });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {/* Color options - Collapsible */}
                <div className="flex items-center space-x-2 ml-6 pt-1 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">Szín:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-5 h-5 p-0 rounded"
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-5 h-5 p-0 rounded"
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-5 h-5 p-0 rounded"
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
              className="w-full mt-2 border-dashed"
              onClick={() => {
                const newOptions = [...(slide.content.options || []), { text: `Opció ${(slide.content.options?.length || 0) + 1}`, textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' }];
                onChange({ content: { ...slide.content, options: newOptions } });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Válasz hozzáadása
            </Button>
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Pontszám</Label>
            <Input
              type="number"
              value={slide.points ?? ''}
              onChange={(e) => onChange({ points: e.target.value })}
              onBlur={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
              className="w-full"
            />
          </div>

          {/* Answer Feedback Options */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showAnswerAfterSlide"
                checked={slide.content.showAnswerAfterSlide || false}
                onCheckedChange={(checked) => onChange({ 
                  content: { ...slide.content, showAnswerAfterSlide: checked }
                })}
              />
              <Label htmlFor="showAnswerAfterSlide" className="text-sm text-gray-600">Helyes válasz mutatása a dia után</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Magyarázat (opcionális)</Label>
              <Textarea
                value={slide.content.answerExplanation || ''}
                onChange={(e) => onChange({ content: { ...slide.content, answerExplanation: e.target.value } })}
                rows={3}
                placeholder="Miért ez a helyes válasz? Írj egy tippet vagy magyarázatot..."
                className="resize-none text-sm"
              />
            </div>
          </div>
        </>
      )}

      {slide.type === 'ranking' && (
        <>
          {/* Question */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Kérdés</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                    style={{ backgroundColor: slide.content.questionColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <SketchPicker
                    color={slide.content.questionColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, questionColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Textarea
              value={slide.content.question || ''}
              onChange={(e) => onChange({ content: { ...slide.content, question: e.target.value } })}
              rows={2}
              placeholder="Rakd sorrendbe..."
              className="resize-none"
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Elemek (helyes sorrendben)</Label>
            {(slide.content.items || []).map((item: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-2 space-y-1 hover:border-purple-300 transition-colors">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500 w-5">{index + 1}.</span>
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
                    className="flex-1 h-8 text-sm"
                    placeholder={`${index + 1}. elem`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    onClick={() => {
                      const newItems = slide.content.items.filter((_: any, i: number) => i !== index);
                      const newOrder = Array.from({ length: newItems.length }, (_, i) => i);
                      onChange({ 
                        content: { ...slide.content, items: newItems, correctOrder: newOrder }
                      });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {/* Colors */}
                <div className="flex items-center space-x-2 ml-5 pt-1 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">Szín:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-5 h-5 p-0 rounded"
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-5 h-5 p-0 rounded"
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-5 h-5 p-0 rounded"
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
              className="w-full border-dashed"
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

          {/* Points */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Pontszám</Label>
            <Input
              type="number"
              value={slide.points ?? ''}
              onChange={(e) => onChange({ points: e.target.value })}
              onBlur={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            />
          </div>

          {/* Answer Feedback Options */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showAnswerAfterSlide-ranking"
                checked={slide.content.showAnswerAfterSlide || false}
                onCheckedChange={(checked) => onChange({ 
                  content: { ...slide.content, showAnswerAfterSlide: checked }
                })}
              />
              <Label htmlFor="showAnswerAfterSlide-ranking" className="text-sm text-gray-600">Helyes válasz mutatása a dia után</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Magyarázat (opcionális)</Label>
              <Textarea
                value={slide.content.answerExplanation || ''}
                onChange={(e) => onChange({ content: { ...slide.content, answerExplanation: e.target.value } })}
                rows={3}
                placeholder="Miért ez a helyes sorrend? Írj egy tippet vagy magyarázatot..."
                className="resize-none text-sm"
              />
            </div>
          </div>
        </>
      )}

      {slide.type === 'matching' && (
        <>
          {/* Question */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Kérdés</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                    style={{ backgroundColor: slide.content.questionColor || theme?.textColor || '#000000' }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <SketchPicker
                    color={slide.content.questionColor || theme?.textColor || '#000000'}
                    onChange={(color) => onChange({ content: { ...slide.content, questionColor: color.hex } })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Textarea
              value={slide.content.question || ''}
              onChange={(e) => onChange({ content: { ...slide.content, question: e.target.value } })}
              rows={2}
              placeholder="Párosítsd össze..."
              className="resize-none"
            />
          </div>

          {/* Pairs */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Párok</Label>
            {(slide.content.pairs || []).map((pair: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-2 space-y-2 hover:border-purple-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">{index + 1}. pár</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    onClick={() => {
                      const newPairs = slide.content.pairs.filter((_: any, i: number) => i !== index);
                      const pointsPerPair = slide.content.pointsPerPair ?? 1;
                      const totalPoints = newPairs.length * pointsPerPair;
                      onChange({ 
                        content: { ...slide.content, pairs: newPairs },
                        points: totalPoints
                      });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-gray-500">Bal</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-4 h-4 p-0 rounded"
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
                          <Button variant="ghost" size="sm" className="w-4 h-4 p-0">
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
                    </div>
                    <Input
                      value={pair.left}
                      onChange={(e) => {
                        const newPairs = [...slide.content.pairs];
                        newPairs[index] = { ...newPairs[index], left: e.target.value };
                        onChange({ content: { ...slide.content, pairs: newPairs } });
                      }}
                      className="h-8 text-sm"
                      placeholder="Bal oldal"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-gray-500">Jobb</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-4 h-4 p-0 rounded"
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
                          <Button variant="ghost" size="sm" className="w-4 h-4 p-0">
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
                    </div>
                    <Input
                      value={pair.right}
                      onChange={(e) => {
                        const newPairs = [...slide.content.pairs];
                        newPairs[index] = { ...newPairs[index], right: e.target.value };
                        onChange({ content: { ...slide.content, pairs: newPairs } });
                      }}
                      className="h-8 text-sm"
                      placeholder="Jobb oldal"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="w-full border-dashed"
              onClick={() => {
                const newPairs = [...(slide.content.pairs || []), { 
                  left: `Elem ${(slide.content.pairs?.length || 0) + 1}`, 
                  right: `Párosítás ${(slide.content.pairs?.length || 0) + 1}`,
                  leftColor: '#ffffff',
                  rightColor: '#ffffff'
                }];
                const pointsPerPair = slide.content.pointsPerPair ?? 1;
                const totalPoints = newPairs.length * pointsPerPair;
                onChange({ 
                  content: { ...slide.content, pairs: newPairs },
                  points: totalPoints
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Pár hozzáadása
            </Button>
          </div>

          {/* Points */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">Pont/pár</Label>
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
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">Összesen</Label>
              <Input
                type="number"
                value={slide.points || 0}
                readOnly
                className="h-8 bg-gray-50"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {slide.content.pairs?.length || 0} pár × {slide.content.pointsPerPair ?? 1} pont
          </p>

          {/* Answer Feedback Options */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showAnswerAfterSlide-matching"
                checked={slide.content.showAnswerAfterSlide || false}
                onCheckedChange={(checked) => onChange({ 
                  content: { ...slide.content, showAnswerAfterSlide: checked }
                })}
              />
              <Label htmlFor="showAnswerAfterSlide-matching" className="text-sm text-gray-600">Helyes válasz mutatása a dia után</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Magyarázat (opcionális)</Label>
              <Textarea
                value={slide.content.answerExplanation || ''}
                onChange={(e) => onChange({ content: { ...slide.content, answerExplanation: e.target.value } })}
                rows={3}
                placeholder="Miért ezek a helyes párosítások? Írj egy tippet vagy magyarázatot..."
                className="resize-none text-sm"
              />
            </div>
          </div>
        </>
      )}

      {slide.type === 'true_false' && (
        <>
          {/* Statement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Állítás</Label>
              <div className="flex items-center space-x-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Matematikai kifejezés">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                      style={{ backgroundColor: slide.content.statementColor || theme?.textColor || '#000000' }}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <SketchPicker
                      color={slide.content.statementColor || theme?.textColor || '#000000'}
                      onChange={(color) => onChange({ content: { ...slide.content, statementColor: color.hex } })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Textarea
              value={slide.content.statement || ''}
              onChange={(e) => onChange({ content: { ...slide.content, statement: e.target.value } })}
              rows={3}
              placeholder="Írd ide az állítást..."
              className="resize-none"
            />
          </div>

          {/* Correct Answer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Helyes válasz</Label>
            <Select
              value={slide.content.correctAnswer === false ? 'false' : 'true'}
              onValueChange={(value) => onChange({ 
                content: { ...slide.content, correctAnswer: value === 'true' },
                correct_answer: value === 'true'
              })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">
                  <span className="text-green-600 font-medium">✓ Igaz</span>
                </SelectItem>
                <SelectItem value="false">
                  <span className="text-red-600 font-medium">✗ Hamis</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Pontszám</Label>
            <Input
              type="number"
              value={slide.points ?? ''}
              onChange={(e) => onChange({ points: e.target.value })}
              onBlur={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            />
          </div>

          {/* Answer Feedback Options */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showAnswerAfterSlide-truefalse"
                checked={slide.content.showAnswerAfterSlide || false}
                onCheckedChange={(checked) => onChange({ 
                  content: { ...slide.content, showAnswerAfterSlide: checked }
                })}
              />
              <Label htmlFor="showAnswerAfterSlide-truefalse" className="text-sm text-gray-600">Helyes válasz mutatása a dia után</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Magyarázat (opcionális)</Label>
              <Textarea
                value={slide.content.answerExplanation || ''}
                onChange={(e) => onChange({ content: { ...slide.content, answerExplanation: e.target.value } })}
                rows={3}
                placeholder="Miért ez a helyes válasz? Írj egy tippet vagy magyarázatot..."
                className="resize-none text-sm"
              />
            </div>
          </div>
        </>
      )}

      {slide.type === 'fill_in_blanks' && (
        <>
          {/* Blanks */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Kitöltendő mezők</Label>
            <p className="text-xs text-gray-500">
              Hozz létre mezőket, majd illessz be dobozokat a szövegbe.
            </p>
            {(slide.content.blanks || []).map((blank: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-2 space-y-2 hover:border-purple-300 transition-colors">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">#{index + 1}</span>
                  <Input
                    value={blank.answer || ''}
                    onChange={(e) => {
                      const newBlanks = [...(slide.content.blanks || [])];
                      newBlanks[index] = { ...newBlanks[index], answer: e.target.value };
                      onChange({ content: { ...slide.content, blanks: newBlanks } });
                    }}
                    placeholder="Helyes válasz"
                    className="flex-1 h-8 text-sm"
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Sigma className="h-3 w-3" />
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
                      <Button variant="outline" size="sm" className="w-7 h-7 p-0 rounded"
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
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    onClick={() => {
                      const newBlanks = (slide.content.blanks || []).filter((_: any, i: number) => i !== index);
                      onChange({ content: { ...slide.content, blanks: newBlanks } });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {blank.answer && blank.answer.includes('\\') && (
                  <div className="pl-2 pt-1 border-t border-gray-100">
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
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Új mező
            </Button>
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Összpontszám</Label>
            <Input
              type="number"
              value={slide.points ?? ''}
              onChange={(e) => onChange({ points: e.target.value })}
              onBlur={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            />
            {(slide.content.blanks || []).length > 0 && (
              <p className="text-xs text-gray-500">
                {Math.floor((typeof slide.points === 'string' ? parseInt(slide.points) || 0 : slide.points || 0) / (slide.content.blanks || []).length)} pont / mező
              </p>
            )}
          </div>

          {/* Answer Feedback Options */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showAnswerAfterSlide-blanks"
                checked={slide.content.showAnswerAfterSlide || false}
                onCheckedChange={(checked) => onChange({ 
                  content: { ...slide.content, showAnswerAfterSlide: checked }
                })}
              />
              <Label htmlFor="showAnswerAfterSlide-blanks" className="text-sm text-gray-600">Helyes válasz mutatása a dia után</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Magyarázat (opcionális)</Label>
              <Textarea
                value={slide.content.answerExplanation || ''}
                onChange={(e) => onChange({ content: { ...slide.content, answerExplanation: e.target.value } })}
                rows={3}
                placeholder="Miért ezek a helyes válaszok? Írj egy tippet vagy magyarázatot..."
                className="resize-none text-sm"
              />
            </div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Scale calculation matching the viewer - use containerRef directly
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.offsetWidth;
        const newScale = parentWidth / 1600;
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, [currentSlide]);

  // LaTeX renderer for preview
  const renderLatex = (text: string, key: string) => {
    if (!text) {
      return <span>{text}</span>;
    }
    
    // Check for any LaTeX indicators
    const hasLatex = text.includes('\\') || text.includes('$');
    
    if (!hasLatex) {
      return <span>{text}</span>;
    }
    
    // Check if already rendered
    if (renderedMath[key]) {
      return <span dangerouslySetInnerHTML={{ __html: renderedMath[key] }} />;
    }
    
    // Load and render KaTeX
    import('katex').then((katex) => {
      try {
        let html = text;
        
        // Handle display math first ($$...$$ and \[...\])
        html = html.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
          try {
            return katex.default.renderToString(formula, { throwOnError: false, displayMode: true });
          } catch {
            return match;
          }
        });
        
        html = html.replace(/\\\[([^]*?)\\\]/g, (match, formula) => {
          try {
            return katex.default.renderToString(formula, { throwOnError: false, displayMode: true });
          } catch {
            return match;
          }
        });
        
        // Handle inline math (\(...\) and $...$)
        html = html.replace(/\\\(([^]*?)\\\)/g, (match, formula) => {
          try {
            return katex.default.renderToString(formula, { throwOnError: false, displayMode: false });
          } catch {
            return match;
          }
        });
        
        html = html.replace(/\$([^$]+)\$/g, (match, formula) => {
          try {
            return katex.default.renderToString(formula, { throwOnError: false, displayMode: false });
          } catch {
            return match;
          }
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
        // Text slides use scaled container - handled separately in render
        return null;
      case 'heading':
        return (
          <div className="text-center">
            <h1 
              className="text-5xl font-bold"
              style={{ 
                color: currentSlide.content.textColor || theme?.textColor || '#000000',
                fontSize: currentSlide.content.fontSize || '48px',
                fontFamily: currentSlide.content.fontFamily || 'Inter'
              }}
            >
              {currentSlide.content.text}
            </h1>
            <p 
              className="text-2xl mt-4"
              style={{ 
                color: currentSlide.content.subtitleColor || theme?.textColor || '#666666',
                fontSize: currentSlide.content.subtitleFontSize || '24px',
                fontFamily: currentSlide.content.subtitleFontFamily || 'Inter'
              }}
            >
              {currentSlide.content.subtitle}
            </p>
          </div>
        );
      case 'image':
        return (
          <div className="text-center">
            <img 
              src={currentSlide.content.url} 
              alt={currentSlide.content.caption} 
              loading="lazy"
              className="max-w-full max-h-[70vh] mx-auto object-contain" 
            />
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
                  <span> • {Math.floor((typeof currentSlide.points === 'string' ? parseInt(currentSlide.points) || 0 : currentSlide.points || 0) / (currentSlide.content.blanks || []).length)} pont/mező</span>
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
      className="fixed inset-0 flex flex-col"
      style={{ 
        backgroundColor: currentSlide.backgroundColor || theme?.background || '#ffffff',
        color: currentSlide.textColor || theme?.textColor || '#000000',
      }}
    >
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main content area - fills available space */}
      <div className="flex-1 overflow-hidden">
        {currentSlide.type === 'text' ? (
          /* Text slides use scaled 1600x900 container matching the viewer */
          (() => {
            const slideHeight = currentSlide.settings?.slideHeight || 760;
            const needsScroll = slideHeight > 760;
            const scaledHeight = slideHeight * scale;
            return (
              <div 
                ref={containerRef}
                className="w-full h-full"
                style={{
                  overflowX: 'hidden',
                  overflowY: needsScroll ? 'auto' : 'hidden',
                }}
              >
                {/* Wrapper that constrains the layout to the scaled visual size */}
                <div
                  style={{
                    width: '100%',
                    height: needsScroll ? 'auto' : `${scaledHeight}px`,
                    overflow: 'hidden',
                  }}
                >
                  <div 
                    className="origin-top-left"
                    style={{
                      width: '1600px',
                      minHeight: `${slideHeight}px`,
                      transform: `scale(${scale})`,
                      backgroundColor: currentSlide.backgroundColor || theme?.background || '#ffffff',
                      color: currentSlide.textColor || theme?.textColor || '#000000',
                    }}
                  >
                    <div className="w-full p-8 overflow-visible relative" style={{ paddingRight: '24px' }}>
                      <RichTextRenderer content={currentSlide.content} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          /* Other slide types use centered layout */
          <div className="w-full h-full flex items-center justify-center p-8">
            {renderSlideContent()}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 flex items-center space-x-4 z-10">
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