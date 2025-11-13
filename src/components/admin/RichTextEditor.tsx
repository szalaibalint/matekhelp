import { useCallback, useMemo, useState, useEffect, forwardRef, useRef } from 'react';
import { createEditor, Descendant, Editor, Transforms, Element as SlateElement, Text, Path, BaseEditor } from 'slate';
import { Slate, Editable, withReact, useSlate, ReactEditor, useSelected, useFocused } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered,
  Quote,
  Code,
  Image,
  Video,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Link,
  RotateCw,
  Maximize,
  Palette,
  Move,
  Minus,
  Sigma
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { SketchPicker } from 'react-color';
import { toast } from '../ui/use-toast';
import { supabase } from '../../../supabase/supabase';
import { Progress } from '../ui/progress';
import UserInputElement from '../viewer/richtext/elements/UserInputElement';
import MathElement from '../viewer/richtext/elements/MathElement';
import DragBlankElement from '../viewer/richtext/elements/DragBlankElement';
import { MathFormulaInsert } from './MathFormulaInsert';
import isBlock from '../viewer/richtext/isBlock';
import { Slide } from '../../services/SlideService';

type CustomElement = { type: string; align?: string; children: CustomText[] | CustomElement[]; url?: string; width?: number; height?: number; rotation?: number; float?: string; correctAnswer?: string; }
type CustomText = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean; color?: string }

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
}

const HOTKEYS: { [key: string]: string } = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

// Auto-detect and convert LaTeX formulas
const withAutoMath = (editor: Editor) => {
  const { insertText, insertData } = editor;

  editor.insertText = (text) => {
    const { selection } = editor;

    if (text === ' ' || text === '\n') {
      if (selection && selection.focus) {
        const [node, path] = Editor.node(editor, selection);
        
        if (Text.isText(node)) {
          const textBefore = node.text;
          
          // Check for LaTeX patterns with $ delimiters only
          // Check $$ first (display math), then $ (inline math)
          let matched = false;
          let formula = '';
          let matchText = '';
          
          // Try display math first: $$formula$$
          const displayMatch = textBefore.match(/\$\$(.+?)\$\$$/);
          if (displayMatch) {
            matchText = displayMatch[0];
            formula = displayMatch[1].trim();
            matched = true;
          } else {
            // Try inline math: $formula$
            const inlineMatch = textBefore.match(/\$(.+?)\$$/);
            if (inlineMatch) {
              matchText = inlineMatch[0];
              formula = inlineMatch[1].trim();
              matched = true;
            }
          }
          
          if (matched && formula) {
            // Delete the matched text
            const startOffset = textBefore.length - matchText.length;
            Transforms.delete(editor, {
              at: {
                anchor: { path, offset: startOffset },
                focus: { path, offset: textBefore.length },
              },
            });
            
            // Insert math element
            const math = { type: 'math-inline', formula, children: [{ text: '' }] };
            Transforms.insertNodes(editor, math);
            
            // Move cursor after the math element
            Transforms.move(editor);
            
            // Insert the space/newline that triggered the conversion
            insertText(text);
            return;
          }
        }
      }
    }

    insertText(text);
  };

  editor.insertData = (data) => {
    const text = data.getData('text/plain');

    if (text) {
      // Process pasted text for LaTeX patterns (only with $ delimiters)
      const lines = text.split('\n');
      let hasInsertedContent = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let lastIndex = 0;
        
        // Match all LaTeX patterns in the line (only with $ delimiters)
        const displayMathRegex = /\$\$([^\$]+)\$\$/g;
        const inlineMathRegex = /\$([^\$]+)\$/g;
        
        // First process display math (higher priority)
        const displayMatches = [...line.matchAll(displayMathRegex)];
        
        if (displayMatches.length > 0) {
          for (const match of displayMatches) {
            const beforeText = line.slice(lastIndex, match.index);
            if (beforeText) {
              editor.insertText(beforeText);
            }
            
            const formula = match[1].trim();
            const math = { type: 'math-inline', formula, children: [{ text: '' }] };
            Transforms.insertNodes(editor, math);
            Transforms.move(editor);
            
            lastIndex = (match.index || 0) + match[0].length;
          }
          
          const remainingText = line.slice(lastIndex);
          if (remainingText) {
            editor.insertText(remainingText);
          }
          
          hasInsertedContent = true;
        } else {
          // Process inline math
          const inlineMatches = [...line.matchAll(inlineMathRegex)];
          
          if (inlineMatches.length > 0) {
            lastIndex = 0;
            for (const match of inlineMatches) {
              const beforeText = line.slice(lastIndex, match.index);
              if (beforeText) {
                editor.insertText(beforeText);
              }
              
              const formula = match[1].trim();
              const math = { type: 'math-inline', formula, children: [{ text: '' }] };
              Transforms.insertNodes(editor, math);
              Transforms.move(editor);
              
              lastIndex = (match.index || 0) + match[0].length;
            }
            
            const remainingText = line.slice(lastIndex);
            if (remainingText) {
              editor.insertText(remainingText);
            }
            
            hasInsertedContent = true;
          } else {
            // No LaTeX found, insert as normal text
            editor.insertText(line);
            hasInsertedContent = true;
          }
        }
        
        // Add newline between lines (except for the last one)
        if (i < lines.length - 1) {
          editor.insertText('\n');
        }
      }

      if (hasInsertedContent) {
        return;
      }
    }

    insertData(data);
  };

  return editor;
};

const isBlockActive = (editor: Editor, format: string, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType as keyof typeof n] === format,
    })
  );

  return !!match;
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof typeof marks] === true : false;
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  );

  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type as string) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });

  let newProperties: Partial<SlateElement>;
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    } as Partial<SlateElement>;
  } else {
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    } as Partial<SlateElement>;
  }

  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor: Editor, format: string, value?: any) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, value || true);
  }
};

const isHotkey = (hotkey: string, event: KeyboardEvent) => {
  const keys = hotkey.split('+');
  const modKey = keys.includes('mod') ? (navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey) : false;
  const key = keys[keys.length - 1];
  
  return modKey && event.key.toLowerCase() === key.toLowerCase();
};

interface RichTextEditorProps {
  content: Descendant[];
  onChange: (content: Descendant[]) => void;
  enableDragBlanks?: boolean;
  blanks?: any[];
  onBlanksChange?: (blanks: any[]) => void;
}

export function RichTextEditor({ content, onChange, enableDragBlanks = false, blanks = [], onBlanksChange }: RichTextEditorProps) {
  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);
  const editor = useMemo(() => {
    const e = withAutoMath(withHistory(withReact(createEditor())));
    const { isInline, isVoid } = e;

    e.isInline = element => {
        return (element.type === 'input-field' || element.type === 'math-inline' || element.type === 'drag-blank') ? true : isInline(element);
    };

    e.isVoid = element => {
        return (element.type === 'input-field' || element.type === 'math-inline' || element.type === 'drag-blank') ? true : isVoid(element);
    };

    return e;
  }, []);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [bgColor, setBgColor] = useState('#ffff00');
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputFieldData, setInputFieldData] = useState({ placeholder: 'Answer', correctAnswer: '', points: 10 });
  const [editingInputFieldPath, setEditingInputFieldPath] = useState<Path | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  
  const insertMathInline = (formula: string) => {
    const math = { type: 'math-inline', formula, children: [{ text: '' }] };
    Transforms.insertNodes(editor, math);
  };

  const handleImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'Hiba', description: 'Kérlek válassz egy képfájlt!', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      // Simulate progress for better UX (Supabase doesn't provide real-time upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from('presentation-images')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('presentation-images')
        .getPublicUrl(filePath);

      insertImage(publicUrl);
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
    } catch (error: any) {
      toast({ title: 'Hiba', description: error.message, variant: 'destructive' });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const initialValue: Descendant[] = content.length > 0 ? content : [
    {
      type: 'paragraph',
      children: [{ text: 'Kezd el itt írni a tartalmat...' }],
    },
  ];

  const insertImage = (url: string) => {
    // Load image to get original dimensions
    const img = document.createElement('img');
    img.onload = () => {
      const image = {
        type: 'image',
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        rotation: 0,
        float: 'none',
        children: [{ text: '' }],
      };
      Transforms.insertNodes(editor, image);
    };
    img.onerror = () => {
      // Fallback to default dimensions if image fails to load
      const image = {
        type: 'image',
        url,
        width: 400,
        height: 300,
        rotation: 0,
        float: 'none',
        children: [{ text: '' }],
      };
      Transforms.insertNodes(editor, image);
    };
    img.src = url;
    setImageUrl('');
  };

  const insertVideo = (url: string) => {
    const video = {
      type: 'video',
      url,
      width: 560,
      height: 315,
      float: 'none',
      children: [{ text: '' }],
    };
    Transforms.insertNodes(editor, video);
    setVideoUrl('');
  };

  const insertLink = (url: string, text: string) => {
    const link = {
      type: 'link',
      url,
      children: [{ text }],
    };
    Transforms.insertNodes(editor, link);
    setLinkUrl('');
    setLinkText('');
  };

    const openInputFieldDialog = (element?: any, path?: Path) => {
    if (element && path) {
      // Edit mode
      const answers = element.correctAnswer.split('|').filter((a: string) => a.trim());
      setCorrectAnswers(answers);
      setInputFieldData({
        placeholder: element.placeholder,
        correctAnswer: element.correctAnswer,
        points: element.points,
      });
      setEditingInputFieldPath(path);
    } else {
      // New field mode
      setCorrectAnswers([]);
      setInputFieldData({ placeholder: 'Answer', correctAnswer: '', points: 10 });
      setEditingInputFieldPath(null);
    }
    setCurrentAnswer('');
    setShowInputDialog(true);
  };

  // Store the callback on the editor instance so Element can access it
  (editor as any).openInputFieldDialog = openInputFieldDialog;

  const addCorrectAnswer = () => {
    if (currentAnswer.trim()) {
      setCorrectAnswers([...correctAnswers, currentAnswer.trim()]);
      setCurrentAnswer('');
    }
  };

  const removeCorrectAnswer = (index: number) => {
    setCorrectAnswers(correctAnswers.filter((_, i) => i !== index));
  };

  const validateBackslashCount = (answers: string[]): boolean => {
    // If no backslashes in any answer, it's valid
    if (!answers.some(a => a.includes('\\'))) {
      return true;
    }
    
    // Count backslashes in each answer
    const backslashCounts = answers.map(a => (a.match(/\\/g) || []).length);
    
    // All answers must have the same number of backslashes
    const firstCount = backslashCounts[0];
    return backslashCounts.every(count => count === firstCount);
  };

  const insertInputField = () => {
    if (correctAnswers.length === 0) {
        toast({
            title: 'Hiba',
            description: 'Legalább egy helyes válasz megadása kötelező.',
            variant: 'destructive',
        });
        return;
    }
    
    // Validate backslash count consistency
    if (!validateBackslashCount(correctAnswers)) {
        toast({
            title: 'Hiba',
            description: 'Ha backslash (\\) karaktert használsz, minden válasznak ugyanannyi backslash-t kell tartalmaznia!',
            variant: 'destructive',
        });
        return;
    }
    
    const combinedAnswer = correctAnswers.join('|');
    
    if (editingInputFieldPath) {
      // Update existing field
      Transforms.setNodes(
        editor,
        {
          placeholder: inputFieldData.placeholder,
          correctAnswer: combinedAnswer,
          points: inputFieldData.points,
        } as any,
        { at: editingInputFieldPath }
      );
    } else {
      // Insert new field
      const inputField = {
        type: 'input-field',
        placeholder: inputFieldData.placeholder,
        correctAnswer: combinedAnswer,
        points: inputFieldData.points,
        children: [{ text: '' }],
      };
      Transforms.insertNodes(editor, inputField);
    }
    
    setShowInputDialog(false);
    setInputFieldData({ placeholder: 'Answer', correctAnswer: '', points: 10 });
    setCorrectAnswers([]);
    setCurrentAnswer('');
    setEditingInputFieldPath(null);
  };

  const insertTable = () => {
    const table = {
      type: 'table',
      children: [
        {
          type: 'table-row',
          children: [
            { type: 'table-cell', children: [{ text: 'Cella 1' }] },
            { type: 'table-cell', children: [{ text: 'Cella 2' }] },
          ],
        },
        {
          type: 'table-row',
          children: [
            { type: 'table-cell', children: [{ text: 'Cella 3' }] },
            { type: 'table-cell', children: [{ text: 'Cella 4' }] },
          ],
        },
      ],
    };
    Transforms.insertNodes(editor, table);
  };

  const applyTextColor = (color: string) => {
    toggleMark(editor, 'color', color);
    setTextColor(color);
  };

  const applyBgColor = (color: string) => {
    toggleMark(editor, 'backgroundColor', color);
    setBgColor(color);
  };

  return (
    <div className="flex flex-col min-h-full bg-white border border-gray-200 rounded-lg">
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={(value) => onChange(value)}
      >
        <div className="border-b border-gray-200 p-3 flex flex-wrap items-center gap-1">
          <MarkButton format="bold" icon={<Bold className="h-4 w-4" />} />
          <MarkButton format="italic" icon={<Italic className="h-4 w-4" />} />
          <MarkButton format="underline" icon={<Underline className="h-4 w-4" />} />
          <MarkButton format="code" icon={<Code className="h-4 w-4" />} />
          
          <Separator orientation="vertical" className="h-6" />
          
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Szöveg szín">
                <Palette className="h-4 w-4" style={{ color: textColor }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <SketchPicker
                color={textColor}
                onChange={(color) => applyTextColor(color.hex)}
              />
            </PopoverContent>
          </Popover>

          <Popover open={showBgColorPicker} onOpenChange={setShowBgColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Háttér szín">
                <div className="h-4 w-4 rounded border border-gray-400" style={{ backgroundColor: bgColor }}></div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <SketchPicker
                color={bgColor}
                onChange={(color) => applyBgColor(color.hex)}
              />
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-6" />
          
          <BlockButton format="heading-one" icon={<Heading1 className="h-4 w-4" />} />
          <BlockButton format="heading-two" icon={<Heading2 className="h-4 w-4" />} />
          <BlockButton format="heading-three" icon={<Heading3 className="h-4 w-4" />} />
          <BlockButton format="paragraph" icon={<Type className="h-4 w-4" />} />
          
          <Separator orientation="vertical" className="h-6" />
          
          <BlockButton format="left" icon={<AlignLeft className="h-4 w-4" />} />
          <BlockButton format="center" icon={<AlignCenter className="h-4 w-4" />} />
          <BlockButton format="right" icon={<AlignRight className="h-4 w-4" />} />
          
          <Separator orientation="vertical" className="h-6" />
          
          <BlockButton format="bulleted-list" icon={<List className="h-4 w-4" />} />
          <BlockButton format="numbered-list" icon={<ListOrdered className="h-4 w-4" />} />
          <BlockButton format="block-quote" icon={<Quote className="h-4 w-4" />} />
          
          <Separator orientation="vertical" className="h-6" />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Image className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kép beillesztése</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kép feltöltése</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="mt-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">Feltöltés: {uploadProgress}%</p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">vagy</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kép URL megadása</label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
                <Button onClick={() => insertImage(imageUrl)} disabled={!imageUrl || isUploading} className="w-full">
                  Kép beillesztése
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Video className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Videó beillesztése</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Videó URL megadása (YouTube, Vimeo, stb.)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <Button onClick={() => insertVideo(videoUrl)} disabled={!videoUrl}>
                  Videó beillesztése
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Link className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link beillesztése</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Link szövege"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                />
                <Input
                  placeholder="URL megadása"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Button onClick={() => insertLink(linkUrl, linkText)} disabled={!linkUrl || !linkText}>
                  Link beillesztése
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="ghost" size="sm" onClick={insertTable}>
            <Table className="h-4 w-4" />
          </Button>
          <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                title="Kitöltendő mező"
                onClick={() => openInputFieldDialog()}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingInputFieldPath ? 'Kitöltendő mező szerkesztése' : 'Kitöltendő mező beillesztése'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Placeholder szöveg</label>
                  <Input
                    placeholder="Placeholder szöveg (pl. 'Válasz')"
                    value={inputFieldData.placeholder}
                    onChange={(e) => setInputFieldData({ ...inputFieldData, placeholder: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Pontszám</label>
                  <Input
                    type="number"
                    placeholder="Pontszám"
                    value={inputFieldData.points}
                    onChange={(e) => setInputFieldData({ ...inputFieldData, points: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Helyes válaszok</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Több helyes válasz is megadható. A diák bármelyiket beírhatja.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Új helyes válasz"
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCorrectAnswer();
                        }
                      }}
                    />
                    <Button type="button" onClick={addCorrectAnswer} variant="outline">
                      Hozzáad
                    </Button>
                  </div>
                  
                  {correctAnswers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {correctAnswers.map((answer, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">{answer}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCorrectAnswer(index)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Button onClick={insertInputField} disabled={correctAnswers.length === 0} className="w-full">
                  {editingInputFieldPath ? 'Módosítás' : 'Beillesztés'}
                </Button>
              </div>
            </DialogContent>
                    </Dialog>
          
          {enableDragBlanks && blanks && blanks.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  title="Húzható doboz beszúrása"
                >
                  <span className="text-xs font-bold">📦</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Húzható doboz beszúrása</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-4">
                    Válaszd ki, melyik kitöltendő mezőhöz szeretnél üres dobozt beszúrni a szövegbe:
                  </p>
                  {blanks.map((blank, index) => (
                    <Button
                      key={blank.id}
                      onClick={() => {
                        const dragBlank = {
                          type: 'drag-blank',
                          slotId: `slot-${Date.now()}-${Math.random()}`, // Unique slot ID
                          blankId: blank.id, // Reference to which answer this slot expects
                          blankIndex: index,
                          children: [{ text: '' }],
                        };
                        Transforms.insertNodes(editor, dragBlank);
                      }}
                      variant="outline"
                      className="w-full justify-start"
                      style={{
                        borderLeft: `4px solid ${blank.color || '#ffffff'}`,
                      }}
                    >
                      #{index + 1} - {blank.answer || '(még nincs válasz)'}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <Dialog>
```
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" title="Matematikai kifejezés">
                <Sigma className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Matematikai kifejezés beillesztése</DialogTitle>
              </DialogHeader>
              <MathFormulaInsert onInsert={(f) => insertMathInline(f)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 p-4 overflow-visible relative min-h-[400px]">
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Kezd el itt írni a tartalmat..."
            spellCheck
            autoFocus
            onKeyDown={(event) => {
              // Handle TAB key
              if (event.key === 'Tab') {
                event.preventDefault();
                editor.insertText('\t');
                return;
              }

              for (const hotkey in HOTKEYS) {
                if (isHotkey(hotkey, event as any)) {
                  event.preventDefault();
                  const mark = HOTKEYS[hotkey];
                  toggleMark(editor, mark);
                }
              }
            }}
            className="min-h-full focus:outline-none"
            style={{ whiteSpace: 'pre-wrap' }}
          />
        </div>
      </Slate>
    </div>
  );
}

const MarkButton = ({ format, icon }: { format: string; icon: React.ReactNode }) => {
  const editor = useSlate();
  return (
    <Button
      variant={isMarkActive(editor, format) ? "default" : "ghost"}
      size="sm"
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {icon}
    </Button>
  );
};

const BlockButton = ({ format, icon }: { format: string; icon: React.ReactNode }) => {
  const editor = useSlate();
  return (
    <Button
      variant={isBlockActive(editor, format, TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type') ? "default" : "ghost"}
      size="sm"
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      {icon}
    </Button>
  );
};

const Element = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  
  switch (element.type) {
    case 'block-quote':
      return (
        <blockquote style={style} {...attributes} className="border-l-4 border-gray-300 pl-4 italic my-4">
          {children}
        </blockquote>
      );
    case 'bulleted-list':
      return (
        <ul style={style} {...attributes} className="list-disc list-inside my-4">
          {children}
        </ul>
      );
    case 'heading-one':
      return (
        <h1 style={style} {...attributes} className="text-3xl font-bold my-4">
          {children}
        </h1>
      );
    case 'heading-two':
      return (
        <h2 style={style} {...attributes} className="text-2xl font-bold my-3">
          {children}
        </h2>
      );
    case 'heading-three':
      return (
        <h3 style={style} {...attributes} className="text-xl font-bold my-2">
          {children}
        </h3>
      );
    case 'list-item':
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case 'numbered-list':
      return (
        <ol style={style} {...attributes} className="list-decimal list-inside my-4">
          {children}
        </ol>
      );
    case 'image':
      return <ImageElement {...attributes} element={element}>{children}</ImageElement>;
    case 'video':
      return <VideoElement {...attributes} element={element}>{children}</VideoElement>;
    case 'link':
      return (
        <a {...attributes} href={element.url} className="text-blue-600 underline">
          {children}
        </a>
      );
    case 'table':
      return (
        <table {...attributes} className="border-collapse border border-gray-300 my-4">
          <tbody>{children}</tbody>
        </table>
      );
    case 'table-row':
      return <tr {...attributes}>{children}</tr>;
    case 'table-cell':
      return (
        <td {...attributes} className="border border-gray-300 p-2">
          {children}
        </td>
      );
    case 'input-field': {
      const editor = useSlate();
      const openDialog = (editor as any).openInputFieldDialog;
      return (
        <UserInputElement
          {...{ attributes, children, element, isEditor: true }}
          onEditClick={() => {
            const path = ReactEditor.findPath(editor, element);
            openDialog(element, path);
          }}
        />
      );
    }
    case 'math-inline': {
      const editor = useSlate();
      return (
        <MathElement
          {...{ attributes, children, element, isEditor: true }}
          onFormulaChange={(formula) => {
            const path = ReactEditor.findPath(editor, element);
            // Bypass TS strict typing for custom field
            Transforms.setNodes(editor, { formula } as any, { at: path });
          }}
        />
      );
    }
    case 'drag-blank':
      return <DragBlankElement {...{ attributes, children, element, isEditor: true }} />;
    case undefined:
    case 'paragraph':
      const hasBlockChild = element.children?.some(isBlock);
      return (
        <p style={style} {...attributes} className={`my-2 ${hasBlockChild ? 'leading-relaxed' : ''}`}>
          {children}
        </p>
      );
  }
};

const ImageElement = forwardRef(({ attributes, children, element }: any, ref) => {
  const editor = useSlate();
  const selected = useSelected();
  const focused = useFocused();
  const [size, setSize] = useState({ width: element.width || 400, height: element.height || 300 });
  const [rotation, setRotation] = useState(element.rotation || 0);
  const [float, setFloat] = useState(element.float || 'none');
  const [align, setAlign] = useState(element.align || 'left');
  const [position, setPosition] = useState(element.position || { x: 0, y: 0 });
  const [isAbsolute, setIsAbsolute] = useState(element.isAbsolute || false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startRotation, setStartRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [editorBounds, setEditorBounds] = useState<DOMRect | null>(null);

  // Get parent block alignment
  let parentAlign = align; // Use image's own alignment instead of parent's
  try {
    const path = ReactEditor.findPath(editor, element);
    const [parentNode] = Editor.parent(editor, path);
    parentAlign = (parentNode as any)?.align || align;
  } catch (e) {
    // If we can't get the parent, use image's own alignment
  }

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startPos.x;
        const deltaY = e.clientY - startPos.y;
        
        if (e.shiftKey) {
          // Maintain aspect ratio when Shift is held
          const newWidth = Math.max(100, startSize.width + deltaX);
          const newHeight = Math.round(newWidth / aspectRatio);
          setSize({ width: newWidth, height: newHeight });
        } else {
          // Free resize
          const newWidth = Math.max(100, startSize.width + deltaX);
          const newHeight = Math.max(75, startSize.height + deltaY);
          setSize({ width: newWidth, height: newHeight });
        }
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        const path = ReactEditor.findPath(editor, element);
        Transforms.setNodes(editor, { width: size.width, height: size.height }, { at: path });
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startPos, startSize, size, editor, element]);

  useEffect(() => {
    if (isRotating) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startPos.x;
        const newRotation = startRotation + deltaX;
        setRotation(newRotation);
      };

      const handleMouseUp = () => {
        setIsRotating(false);
        const path = ReactEditor.findPath(editor, element);
        Transforms.setNodes(editor, { rotation }, { at: path });
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isRotating, startPos, startRotation, rotation, editor, element]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        // Get the specific editor container
        const editorEl = ReactEditor.toDOMNode(editor, editor);
        const editorContainer = editorEl.closest('.flex-1.p-4.overflow-visible') as HTMLElement;
        if (!editorContainer) return;
        
        const containerRect = editorContainer.getBoundingClientRect();
        
        const deltaX = e.clientX - startPos.x;
        const deltaY = e.clientY - startPos.y;
        
        // Calculate new position with bounds checking
        let newX = position.x + deltaX;
        let newY = position.y + deltaY;
        
        // Constrain within editor container (accounting for image size and padding)
        const maxX = containerRect.width - size.width - 32; // 32 for padding
        const maxY = containerRect.height - size.height - 32;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        setPosition({ x: newX, y: newY });
        setStartPos({ x: e.clientX, y: e.clientY });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        const path = ReactEditor.findPath(editor, element);
        Transforms.setNodes(editor, { position } as any, { at: path });
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startPos, position, editor, element, size]);

  const handleFloatChange = (newFloat: string) => {
    setFloat(newFloat);
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(editor, { float: newFloat } as any, { at: path });
  };

  const handleAlignChange = (newAlign: string) => {
    setAlign(newAlign);
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(editor, { align: newAlign } as any, { at: path });
  };

  const toggleAbsolutePosition = () => {
    const newIsAbsolute = !isAbsolute;
    setIsAbsolute(newIsAbsolute);
    const path = ReactEditor.findPath(editor, element);
    if (newIsAbsolute) {
      // Switch to absolute positioning
      Transforms.setNodes(editor, { isAbsolute: true, position, float: 'none' } as any, { at: path });
      setFloat('none');
    } else {
      // Switch back to inline/float positioning
      Transforms.setNodes(editor, { isAbsolute: false, position: { x: 0, y: 0 } } as any, { at: path });
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <div 
      {...attributes} 
      className="group my-4"
      contentEditable={false}
      style={{
        position: isAbsolute ? 'absolute' : 'relative',
        left: isAbsolute ? `${position.x}px` : undefined,
        top: isAbsolute ? `${position.y}px` : undefined,
        float: !isAbsolute && float !== 'none' ? float as any : undefined,
        margin: !isAbsolute && float !== 'none' ? '0 10px' : isAbsolute ? 0 : '0 auto',
        zIndex: isAbsolute ? 1 : undefined,
        display: isAbsolute ? 'block' : float === 'none' ? 'block' : 'inline-block',
        textAlign: !isAbsolute && float === 'none' ? parentAlign as any : undefined,
      }}
    >
      <div className="relative" style={{ display: 'inline-block' }}>
        <img
          src={element.url}
          alt=""
          style={{
            width: size.width,
            height: size.height,
            transform: `rotate(${rotation}deg)`,
            maxWidth: '100%',
            cursor: isAbsolute ? 'move' : 'default',
          }}
          className={`block border-2 transition-all ${selected && focused ? 'border-blue-500' : 'border-transparent group-hover:border-blue-300'}`}
          onMouseDown={(e) => {
            if (isAbsolute && !isResizing && !isRotating) {
              e.preventDefault();
              setIsDragging(true);
              setStartPos({ x: e.clientX, y: e.clientY });
            }
          }}
        />
        
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            setStartPos({ x: e.clientX, y: e.clientY });
            setStartSize(size);
            setAspectRatio(size.width / size.height);
          }}
        />
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col space-y-1 bg-white rounded shadow-lg p-1">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsRotating(true);
                setStartPos({ x: e.clientX, y: e.clientY });
                setStartRotation(rotation);
              }}
              title="Tartsa lenyomva a forgatáshoz"
            >
              <RotateCw className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={isAbsolute ? "default" : "secondary"}
              className="h-8 w-8 p-0"
              onClick={toggleAbsolutePosition}
              title={isAbsolute ? "Vissza a szövegbe" : "Szabadon mozgatható"}
            >
              <Move className="h-3 w-3" />
            </Button>
            {!isAbsolute && float === 'none' && (
              <>
                <Button
                  size="sm"
                  variant={align === 'left' ? "default" : "secondary"}
                  className="h-8 w-8 p-0"
                  onClick={() => handleAlignChange('left')}
                  title="Balra igazítás"
                >
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={align === 'center' ? "default" : "secondary"}
                  className="h-8 w-8 p-0"
                  onClick={() => handleAlignChange('center')}
                  title="Középre igazítás"
                >
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={align === 'right' ? "default" : "secondary"}
                  className="h-8 w-8 p-0"
                  onClick={() => handleAlignChange('right')}
                  title="Jobbra igazítás"
                >
                  <AlignRight className="h-3 w-3" />
                </Button>
              </>
            )}
            {!isAbsolute && (
              <Select value={float} onValueChange={handleFloatChange}>
                <SelectTrigger className="h-8 w-20 text-xs">
                  <Palette className="h-3 w-3" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sorban</SelectItem>
                  <SelectItem value="left">Balra úsztatás</SelectItem>
                  <SelectItem value="right">Jobbra úsztatás</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
});

const VideoElement = forwardRef(({ attributes, children, element }: any, ref) => {
  const editor = useSlate();
  const selected = useSelected();
  const focused = useFocused();
  const [size, setSize] = useState({ width: element.width || 560, height: element.height || 315 });
  const [float, setFloat] = useState(element.float || 'none');
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startPos.x;
        const newWidth = Math.max(200, startSize.width + deltaX);
        const newHeight = (newWidth / 16) * 9;
        setSize({ width: newWidth, height: newHeight });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        const path = ReactEditor.findPath(editor, element);
        Transforms.setNodes(editor, { width: size.width, height: size.height }, { at: path });
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startPos, startSize, size, editor, element]);

  const handleFloatChange = (newFloat: string) => {
    setFloat(newFloat);
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(editor, { float: newFloat }, { at: path });
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop()
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <div 
      {...attributes} 
      className="relative inline-block group my-4"
      style={{
        float: float !== 'none' ? float as any : undefined,
        margin: float !== 'none' ? '0 10px' : '0 auto'
      }}
    >
      <div className="relative">
        <iframe
          src={getEmbedUrl(element.url)}
          width={size.width}
          height={size.height}
          frameBorder="0"
          allowFullScreen
          className={`max-w-full border-2 transition-all ${selected && focused ? 'border-blue-500' : 'border-transparent group-hover:border-blue-300'}`}
        />
        
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            setStartPos({ x: e.clientX, y: e.clientY });
            setStartSize(size);
          }}
        />
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white rounded shadow-lg p-1">
            <Select value={float} onValueChange={handleFloatChange}>
              <SelectTrigger className="h-8 w-20 text-xs">
                <Move className="h-3 w-3" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sorban</SelectItem>
                <SelectItem value="left">Balra úsztatás</SelectItem>
                <SelectItem value="right">Jobbra úsztatás</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
});

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  const style: any = {};
  
  if (leaf.color) {
    style.color = leaf.color;
  }
  
  if (leaf.backgroundColor) {
    style.backgroundColor = leaf.backgroundColor;
  }

  return <span {...attributes} style={style}>{children}</span>;
};

function SlideEditor({ slide, onChange, theme }: { slide: Slide; onChange: (updates: Partial<Slide>) => void; theme: any }) {
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dia szerkesztése</h2>
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Változtatások visszavonása
        </Button>
      </div>
      
      <Separator />
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Dia címe
        </label>
        <Input
          placeholder="Írd be a dia címét"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="mt-1"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Háttérszín
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBgColorPicker(true)}
            className="flex items-center gap-2"
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: slide.backgroundColor }} />
            {slide.backgroundColor || 'Nincs szín megadva'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ backgroundColor: null })}
          >
            Eredeti háttér
          </Button>
        </div>
      </div>
      
      <Dialog open={showBgColorPicker} onOpenChange={setShowBgColorPicker}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Szín kiválasztása
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Háttérszín kiválasztása</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <SketchPicker
              color={slide.backgroundColor || '#ffffff'}
              onChangeComplete={(color) => onChange({ backgroundColor: color.hex })}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      <Separator />
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Dia tartalma
        </label>
        <div className="mt-1">
          <RichTextEditor
            content={slide.content}
            onChange={(content) => onChange({ content })}
          />
        </div>
      </div>
    </div>
  );
}