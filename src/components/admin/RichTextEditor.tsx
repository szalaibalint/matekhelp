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
  Film,
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
  Sigma,
  X,
  Trash2,
  Superscript,
  Subscript
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { SketchPicker } from '../ui/color-picker';
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
type CustomText = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean; superscript?: boolean; subscript?: boolean; color?: string; fontSize?: string; fontFamily?: string }

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
          
          // Check for LaTeX patterns: $$...$$ or \[...\] for display, $...$ or \(...\) for inline
          let matched = false;
          let formula = '';
          let matchText = '';
          let isDisplayMode = false;
          
          // Try display math first: $$formula$$ or \[formula\]
          const displayMatch1 = textBefore.match(/\$\$(.+?)\$\$$/);
          const displayMatch2 = textBefore.match(/\\\[([^]*?)\\\]$/);
          
          if (displayMatch1) {
            matchText = displayMatch1[0];
            formula = displayMatch1[1].trim();
            matched = true;
            isDisplayMode = true;
          } else if (displayMatch2) {
            matchText = displayMatch2[0];
            formula = displayMatch2[1].trim();
            matched = true;
            isDisplayMode = true;
          } else {
            // Try inline math: $formula$ or \(formula\)
            const inlineMatch1 = textBefore.match(/\$(.+?)\$$/);
            const inlineMatch2 = textBefore.match(/\\\(([^]*?)\\\)$/);
            
            if (inlineMatch1) {
              matchText = inlineMatch1[0];
              formula = inlineMatch1[1].trim();
              matched = true;
            } else if (inlineMatch2) {
              matchText = inlineMatch2[0];
              formula = inlineMatch2[1].trim();
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
            
            // Preserve current marks to apply to text after math element
            const originalMarks = Editor.marks(editor);
            
            // Clear marks before inserting void element
            (editor as any).marks = null;
            
            // Insert math element with displayMode flag if needed
            const math = { 
              type: 'math-inline', 
              formula, 
              displayMode: isDisplayMode,
              children: [{ text: '' }] 
            };
            Transforms.insertNodes(editor, math);
            
            // Move cursor after the math element
            Transforms.move(editor);
            
            // Restore original marks for subsequent text (space/newline)
            if (originalMarks) {
              (editor as any).marks = { ...originalMarks };
            }
            
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
      // Process pasted text for LaTeX patterns
      // Use a unified approach to find all math patterns and process them in order
      const lines = text.split('\n');
      let hasInsertedContent = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Combined regex that matches both display and inline math
        // Display: $$...$$ or \[...\]
        // Inline: $...$ (single $ with non-greedy content) or \(...\)
        // Using non-greedy matching (.+?) to correctly handle multiple math expressions
        const mathRegex = /(\$\$(.+?)\$\$|\\\[(.+?)\\\]|\$([^$\n]+?)\$|\\\((.+?)\\\))/g;
        
        const allMatches: Array<{
          index: number;
          length: number;
          formula: string;
          isDisplay: boolean;
        }> = [];
        
        let match;
        while ((match = mathRegex.exec(line)) !== null) {
          const fullMatch = match[0];
          let formula: string;
          let isDisplay = false;
          
          if (match[2]) {
            // $$...$$ display math
            formula = match[2].trim();
            isDisplay = true;
          } else if (match[3]) {
            // \[...\] display math
            formula = match[3].trim();
            isDisplay = true;
          } else if (match[4]) {
            // $...$ inline math
            formula = match[4].trim();
          } else if (match[5]) {
            // \(...\) inline math
            formula = match[5].trim();
          } else {
            continue;
          }
          
          if (formula) {
            allMatches.push({
              index: match.index,
              length: fullMatch.length,
              formula,
              isDisplay,
            });
          }
        }
        
        if (allMatches.length > 0) {
          let lastIndex = 0;
          
          // Preserve current marks to apply to text after math elements
          const originalMarks = Editor.marks(editor);
          
          for (const m of allMatches) {
            // Insert text before this match (with original marks)
            const beforeText = line.slice(lastIndex, m.index);
            if (beforeText) {
              editor.insertText(beforeText);
            }
            
            // Clear marks before inserting void element
            (editor as any).marks = null;
            
            // Insert math element
            const math = { 
              type: 'math-inline', 
              formula: m.formula, 
              displayMode: m.isDisplay,
              children: [{ text: '' }] 
            };
            Transforms.insertNodes(editor, math);
            
            // Move cursor to position after the void element
            Transforms.move(editor);
            
            // Restore original marks for subsequent text
            if (originalMarks) {
              (editor as any).marks = { ...originalMarks };
            }
            
            lastIndex = m.index + m.length;
          }
          
          // Insert remaining text after last match (with original marks)
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
  const videoInputRef = useRef<HTMLInputElement>(null);
  const animationInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [bgColor, setBgColor] = useState('#ffff00');
  const [fontSize, setFontSize] = useState('16px');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputFieldData, setInputFieldData] = useState<{ placeholder: string; correctAnswer: string; points: string | number }>({ placeholder: 'Answer', correctAnswer: '', points: 10 });
  const [editingInputFieldPath, setEditingInputFieldPath] = useState<Path | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  
  const insertMathInline = (formula: string) => {
    const math = { type: 'math-inline', formula, fontSize, children: [{ text: '' }] };
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

  // Sync editor content when the content prop changes (e.g., switching slides)
  useEffect(() => {
    const isContentDifferent = JSON.stringify(editor.children) !== JSON.stringify(content);
    if (isContentDifferent && content.length > 0) {
      // Replace all content without triggering onChange
      Editor.withoutNormalizing(editor, () => {
        // Remove all existing children
        for (let i = editor.children.length - 1; i >= 0; i--) {
          Transforms.removeNodes(editor, { at: [i] });
        }
        // Insert new content
        Transforms.insertNodes(editor, content, { at: [0] });
      });
    }
  }, [content, editor]);

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

  const handleVideoUpload = async (file: File) => {
    if (!file || !file.type.startsWith('video/')) {
      toast({ title: 'Hiba', description: 'Kérlek válassz egy videófájlt!', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('presentation-images')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('presentation-images')
        .getPublicUrl(filePath);

      insertVideo(publicUrl);
      
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

  const handleAnimationUpload = async (file: File) => {
    if (!file || !file.type.startsWith('video/')) {
      toast({ title: 'Hiba', description: 'Kérlek válassz egy videófájlt!', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const filePath = `${Date.now()}-${file.name}`;
      
      // Simulate upload progress since Supabase doesn't provide it directly
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const { error: uploadError } = await supabase.storage
        .from('presentation-images')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('presentation-images')
        .getPublicUrl(filePath);

      insertAnimation(publicUrl);
      
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

  const insertAnimation = (url: string) => {
    // Create a video element to get dimensions
    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      const animation = {
        type: 'animation',
        url,
        width: video.videoWidth || 640,
        height: video.videoHeight || 480,
        rotation: 0,
        float: 'none',
        align: 'left',
        position: { x: 0, y: 0 },
        isAbsolute: false,
        children: [{ text: '' }],
      };
      Transforms.insertNodes(editor, animation);
    };
    video.onerror = () => {
      // If metadata loading fails, use default dimensions
      const animation = {
        type: 'animation',
        url,
        width: 640,
        height: 480,
        rotation: 0,
        float: 'none',
        align: 'left',
        position: { x: 0, y: 0 },
        isAbsolute: false,
        children: [{ text: '' }],
      };
      Transforms.insertNodes(editor, animation);
    };
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
          points: typeof inputFieldData.points === 'string' ? parseInt(inputFieldData.points) || 0 : inputFieldData.points,
        } as any,
        { at: editingInputFieldPath }
      );
    } else {
      // Insert new field
      const inputField = {
        type: 'input-field',
        placeholder: inputFieldData.placeholder,
        correctAnswer: combinedAnswer,
        points: typeof inputFieldData.points === 'string' ? parseInt(inputFieldData.points) || 0 : inputFieldData.points,
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

  const applyFontSize = (size: string) => {
    toggleMark(editor, 'fontSize', size);
    setFontSize(size);
  };

  const applyFontFamily = (family: string) => {
    toggleMark(editor, 'fontFamily', family);
    setFontFamily(family);
  };

  const applyBgColor = (color: string) => {
    toggleMark(editor, 'backgroundColor', color);
    setBgColor(color);
  };

  return (
    <div className="relative min-h-full">
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={(value) => onChange(value)}
      >
        {/* Toolbar positioned absolutely above the content, doesn't affect content flow */}
        <div className="absolute top-0 left-0 right-0 z-20 border-b border-gray-200 p-4 flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-sm rounded-t-lg" style={{ transform: 'translateY(-100%)' }}>
          <MarkButton format="bold" icon={<Bold className="h-5 w-5" />} />
          <MarkButton format="italic" icon={<Italic className="h-5 w-5" />} />
          <MarkButton format="underline" icon={<Underline className="h-5 w-5" />} />
          <MarkButton format="code" icon={<Code className="h-5 w-5" />} />
          <MarkButton format="superscript" icon={<Superscript className="h-5 w-5" />} />
          <MarkButton format="subscript" icon={<Subscript className="h-5 w-5" />} />
          
          <Separator orientation="vertical" className="h-8" />
          
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Szöveg szín">
                <Palette className="h-5 w-5" style={{ color: textColor }} />
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
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Háttér szín">
                <div className="h-5 w-5 rounded border border-gray-400" style={{ backgroundColor: bgColor }}></div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <SketchPicker
                color={bgColor}
                onChange={(color) => applyBgColor(color.hex)}
              />
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-8" />
          
          <Select value={fontSize} onValueChange={applyFontSize}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Méret" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12px">12px</SelectItem>
              <SelectItem value="14px">14px</SelectItem>
              <SelectItem value="16px">16px</SelectItem>
              <SelectItem value="18px">18px</SelectItem>
              <SelectItem value="20px">20px</SelectItem>
              <SelectItem value="24px">24px</SelectItem>
              <SelectItem value="28px">28px</SelectItem>
              <SelectItem value="32px">32px</SelectItem>
              <SelectItem value="36px">36px</SelectItem>
              <SelectItem value="48px">48px</SelectItem>
              <SelectItem value="64px">64px</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fontFamily} onValueChange={applyFontFamily}>
            <SelectTrigger className="w-[140px] h-9">
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
          
          <Separator orientation="vertical" className="h-8" />
          
          <BlockButton format="heading-one" icon={<Heading1 className="h-5 w-5" />} />
          <BlockButton format="heading-two" icon={<Heading2 className="h-5 w-5" />} />
          <BlockButton format="heading-three" icon={<Heading3 className="h-5 w-5" />} />
          <BlockButton format="paragraph" icon={<Type className="h-5 w-5" />} />
          
          <Separator orientation="vertical" className="h-8" />
          
          <BlockButton format="left" icon={<AlignLeft className="h-5 w-5" />} />
          <BlockButton format="center" icon={<AlignCenter className="h-5 w-5" />} />
          <BlockButton format="right" icon={<AlignRight className="h-5 w-5" />} />
          
          <Separator orientation="vertical" className="h-8" />
          
          <BlockButton format="bulleted-list" icon={<List className="h-5 w-5" />} />
          <BlockButton format="numbered-list" icon={<ListOrdered className="h-5 w-5" />} />
          <BlockButton format="block-quote" icon={<Quote className="h-5 w-5" />} />
          
          <Separator orientation="vertical" className="h-8" />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Image className="h-5 w-5" />
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
                <Film className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Animáció beillesztése</DialogTitle>
                <p className="text-sm text-gray-500">Automatikusan lejátszódó, ismétlődő videó (hang nélkül)</p>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Videófájl feltöltése</label>
                  <input
                    ref={animationInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAnimationUpload(file);
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
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Video className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Videó beillesztése</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Videófájl feltöltése</label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleVideoUpload(file);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Feltöltés...' : 'Videófájl kiválasztása'}
                  </Button>
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-center text-gray-500">{uploadProgress}%</p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Vagy</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Videó URL megadása</label>
                  <Input
                    placeholder="YouTube, Vimeo, stb."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <Button onClick={() => insertVideo(videoUrl)} disabled={!videoUrl} className="w-full">
                    URL beillesztése
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Link className="h-5 w-5" />
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
          
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={insertTable}>
            <Table className="h-5 w-5" />
          </Button>
          <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0"
                title="Kitöltendő mező"
                onClick={() => openInputFieldDialog()}
              >
                <Minus className="h-5 w-5" />
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
                    value={inputFieldData.points ?? ''}
                    onChange={(e) => setInputFieldData({ ...inputFieldData, points: e.target.value })}
                    onBlur={(e) => setInputFieldData({ ...inputFieldData, points: parseInt(e.target.value) || 0 })}
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
                  className="h-9 w-9 p-0"
                  title="Húzható doboz beszúrása"
                >
                  <span className="text-base font-bold">📦</span>
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
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Matematikai kifejezés">
                <Sigma className="h-5 w-5" />
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

        {/* Content area - matches Preview and Viewer structure exactly */}
        <div className="w-full p-8 overflow-visible relative" style={{ paddingRight: '24px' }}>
          <div className="prose prose-lg max-w-none relative" style={{ whiteSpace: 'pre-wrap' }}>
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
            />
          </div>
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
      className="h-9 w-9 p-0"
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
      className="h-9 w-9 p-0"
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
    case 'animation':
      return <AnimationElement {...attributes} element={element}>{children}</AnimationElement>;
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
      return (
        <UserInputElement
          {...{ attributes, children, element, isEditor: true }}
          onFieldChange={(updates: { placeholder?: string; correctAnswer?: string; points?: number }) => {
            const path = ReactEditor.findPath(editor, element);
            Transforms.setNodes(editor, updates as any, { at: path });
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
          onFontSizeChange={(fontSize) => {
            const path = ReactEditor.findPath(editor, element);
            Transforms.setNodes(editor, { fontSize } as any, { at: path });
          }}
        />
      );
    }
    case 'drag-blank':
      return <DragBlankElement {...{ attributes, children, element, isEditor: true }} />;
    case undefined:
    case 'paragraph': {
      const hasBlockChild = element.children?.some(isBlock);
      // Check if the paragraph is empty (only contains empty text nodes)
      const isEmpty = element.children?.every((child: any) => 
        child.text === '' || (typeof child.text === 'string' && child.text.trim() === '')
      );
      return (
        <p style={style} {...attributes} className={`my-2 ${hasBlockChild ? 'leading-relaxed' : ''} ${isEmpty ? 'min-h-[1.5em]' : ''}`}>
          {children}
        </p>
      );
    }
  }
};

// Slide canvas dimensions
const SLIDE_WIDTH = 1600;
const SLIDE_HEIGHT = 900;

const ImageElement = forwardRef(({ attributes, children, element }: any, ref) => {
  const editor = useSlate();
  const selected = useSelected();
  const focused = useFocused();
  const imageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: element.width || 400, height: element.height || 300 });
  const [rotation, setRotation] = useState(element.rotation || 0);
  const [float, setFloat] = useState(element.float || 'none');
  const [align, setAlign] = useState(element.align || 'left');
  const [position, setPosition] = useState(element.position || { x: 0, y: 0 });
  const [isAbsolute, setIsAbsolute] = useState(element.isAbsolute || false);
  
  // Refs for smooth dragging/resizing - no re-renders during drag
  const dragStateRef = useRef({
    isDragging: false,
    isResizing: false,
    isRotating: false,
    resizeCorner: '',
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startRotation: 0,
    startPosX: 0,
    startPosY: 0,
    aspectRatio: 1,
    scale: 1,
  });

  // Get the current scale from the editor container's CSS transform
  const getScale = () => {
    if (!imageRef.current) return 1;
    let parent: HTMLElement | null = imageRef.current;
    while (parent) {
      const transform = window.getComputedStyle(parent).transform;
      if (transform && transform !== 'none') {
        const match = transform.match(/matrix\(([^,]+)/);
        if (match) {
          return parseFloat(match[1]) || 1;
        }
      }
      parent = parent.parentElement;
    }
    return 1;
  };

  // Get parent block alignment
  let parentAlign = align;
  try {
    const path = ReactEditor.findPath(editor, element);
    const [parentNode] = Editor.parent(editor, path);
    parentAlign = (parentNode as any)?.align || align;
  } catch (e) {
    // If we can't get the parent, use image's own alignment
  }

  // Unified mouse handler for all interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      const scale = state.scale || 1;
      
      if (state.isResizing) {
        e.preventDefault();
        // Compensate for scale - divide by scale to get true canvas pixels
        const deltaX = (e.clientX - state.startX) / scale;
        const deltaY = (e.clientY - state.startY) / scale;
        
        let newWidth = state.startWidth;
        let newHeight = state.startHeight;
        let newPosX = state.startPosX;
        let newPosY = state.startPosY;
        
        // Handle different corners - resize from the corner being dragged
        if (state.resizeCorner.includes('e')) {
          newWidth = Math.max(50, state.startWidth + deltaX);
        }
        if (state.resizeCorner.includes('w')) {
          newWidth = Math.max(50, state.startWidth - deltaX);
          // Move position to keep right edge fixed
          if (isAbsolute) {
            newPosX = state.startPosX + (state.startWidth - newWidth);
          }
        }
        if (state.resizeCorner.includes('s')) {
          newHeight = Math.max(50, state.startHeight + deltaY);
        }
        if (state.resizeCorner.includes('n')) {
          newHeight = Math.max(50, state.startHeight - deltaY);
          // Move position to keep bottom edge fixed
          if (isAbsolute) {
            newPosY = state.startPosY + (state.startHeight - newHeight);
          }
        }
        
        // Maintain aspect ratio with Shift key
        if (e.shiftKey) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            const oldHeight = newHeight;
            newHeight = Math.round(newWidth / state.aspectRatio);
            // Adjust position for north corners when maintaining aspect ratio
            if (state.resizeCorner.includes('n') && isAbsolute) {
              newPosY = state.startPosY + (state.startHeight - newHeight);
            }
          } else {
            const oldWidth = newWidth;
            newWidth = Math.round(newHeight * state.aspectRatio);
            // Adjust position for west corners when maintaining aspect ratio
            if (state.resizeCorner.includes('w') && isAbsolute) {
              newPosX = state.startPosX + (state.startWidth - newWidth);
            }
          }
        }
        
        // Constrain to slide bounds for absolute positioned images
        if (isAbsolute) {
          // Ensure image stays within slide
          newPosX = Math.max(0, Math.min(newPosX, SLIDE_WIDTH - newWidth));
          newPosY = Math.max(0, Math.min(newPosY, SLIDE_HEIGHT - newHeight));
          // Adjust size if position was clamped
          if (newPosX === 0 && state.resizeCorner.includes('w')) {
            newWidth = state.startPosX + state.startWidth;
          }
          if (newPosY === 0 && state.resizeCorner.includes('n')) {
            newHeight = state.startPosY + state.startHeight;
          }
          setPosition({ x: newPosX, y: newPosY });
        }
        
        setSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
      }
      
      if (state.isRotating) {
        e.preventDefault();
        if (!imageRef.current) return;
        
        const rect = imageRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const startAngle = Math.atan2(state.startY - centerY, state.startX - centerX);
        const deltaAngle = ((angle - startAngle) * 180) / Math.PI;
        
        let newRotation = state.startRotation + deltaAngle;
        
        // Snap to 15 degree increments when holding Shift
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }
        
        setRotation(newRotation);
      }
      
      if (state.isDragging) {
        e.preventDefault();
        // Compensate for scale - divide by scale to get true canvas pixels
        const deltaX = (e.clientX - state.startX) / scale;
        const deltaY = (e.clientY - state.startY) / scale;
        
        let newX = state.startPosX + deltaX;
        let newY = state.startPosY + deltaY;
        
        // Constrain to slide bounds (keep image fully within the slide)
        newX = Math.max(0, Math.min(newX, SLIDE_WIDTH - size.width));
        newY = Math.max(0, Math.min(newY, SLIDE_HEIGHT - size.height));
        
        setPosition({ x: Math.round(newX), y: Math.round(newY) });
      }
    };

    const handleMouseUp = () => {
      const state = dragStateRef.current;
      
      if (state.isResizing || state.isRotating || state.isDragging) {
        try {
          const path = ReactEditor.findPath(editor, element);
          
          if (state.isResizing) {
            const updates: any = { width: size.width, height: size.height };
            if (isAbsolute) {
              updates.position = position;
            }
            Transforms.setNodes(editor, updates, { at: path });
          }
          if (state.isRotating) {
            Transforms.setNodes(editor, { rotation }, { at: path });
          }
          if (state.isDragging) {
            Transforms.setNodes(editor, { position } as any, { at: path });
          }
        } catch (e) {
          // Element may have been removed
        }
        
        state.isDragging = false;
        state.isResizing = false;
        state.isRotating = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor, element, size, rotation, position, isAbsolute]);

  const startResize = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    const state = dragStateRef.current;
    state.isResizing = true;
    state.resizeCorner = corner;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startWidth = size.width;
    state.startHeight = size.height;
    state.startPosX = position.x;
    state.startPosY = position.y;
    state.aspectRatio = size.width / size.height;
    state.scale = getScale();
    document.body.style.cursor = corner.includes('n') || corner.includes('s') 
      ? (corner === 'n' || corner === 's' ? 'ns-resize' : corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize')
      : 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const startRotate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = dragStateRef.current;
    state.isRotating = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startRotation = rotation;
    state.scale = getScale();
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const startDrag = (e: React.MouseEvent) => {
    if (!isAbsolute) return;
    e.preventDefault();
    e.stopPropagation();
    const state = dragStateRef.current;
    state.isDragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startPosX = position.x;
    state.startPosY = position.y;
    state.scale = getScale();
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

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
      Transforms.setNodes(editor, { isAbsolute: true, position, float: 'none' } as any, { at: path });
      setFloat('none');
    } else {
      Transforms.setNodes(editor, { isAbsolute: false, position: { x: 0, y: 0 } } as any, { at: path });
      setPosition({ x: 0, y: 0 });
    }
  };

  const deleteImage = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, { at: path });
  };

  const isSelected = selected && focused;

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
        zIndex: isAbsolute ? 10 : undefined,
        display: isAbsolute ? 'block' : float === 'none' ? 'block' : 'inline-block',
        textAlign: !isAbsolute && float === 'none' ? parentAlign as any : undefined,
      }}
    >
      <div 
        ref={imageRef}
        className="relative" 
        style={{ 
          display: 'inline-block',
          transform: `rotate(${rotation}deg)`,
        }}
      >
        <img
          src={element.url}
          alt=""
          loading="lazy"
          draggable={false}
          style={{
            width: size.width,
            height: size.height,
            maxWidth: 'none',
            cursor: isAbsolute ? 'grab' : 'default',
          }}
          className={`block transition-shadow ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : 'group-hover:ring-2 group-hover:ring-purple-300 group-hover:ring-offset-1'}`}
          onMouseDown={startDrag}
        />
        
        {/* Resize handles - all corners and edges */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {/* Corner handles */}
          <div 
            className="absolute -top-2 -left-2 w-4 h-4 bg-purple-500 rounded-full cursor-nw-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 'nw')}
          />
          <div 
            className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full cursor-ne-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 'ne')}
          />
          <div 
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-500 rounded-full cursor-sw-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 'sw')}
          />
          <div 
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 rounded-full cursor-se-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 'se')}
          />
          
          {/* Edge handles */}
          <div 
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-purple-500 rounded-full cursor-n-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 'n')}
          />
          <div 
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-purple-500 rounded-full cursor-s-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 's')}
          />
          <div 
            className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-8 bg-purple-500 rounded-full cursor-w-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 'w')}
          />
          <div 
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 bg-purple-500 rounded-full cursor-e-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all"
            onMouseDown={(e) => startResize(e, 'e')}
          />
          
          {/* Rotation handle */}
          <div 
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto"
            onMouseDown={startRotate}
          >
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full cursor-grab shadow-lg hover:from-purple-600 hover:to-purple-800 hover:scale-110 transition-all flex items-center justify-center">
              <RotateCw className="h-3 w-3 text-white" />
            </div>
            <div className="w-0.5 h-4 bg-purple-500" />
          </div>
        </div>
        
        {/* Floating toolbar */}
        <div className={`absolute -top-12 left-0 transition-all ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
          <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm rounded-lg p-1.5 shadow-xl border border-gray-700">
            <Button
              size="sm"
              variant={isAbsolute ? "default" : "ghost"}
              className={`h-7 w-7 p-0 ${isAbsolute ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={toggleAbsolutePosition}
              title={isAbsolute ? "Vissza a szövegbe" : "Szabadon mozgatható"}
            >
              <Move className="h-3.5 w-3.5" />
            </Button>
            
            {!isAbsolute && (
              <>
                <div className="w-px h-5 bg-gray-600" />
                <Button
                  size="sm"
                  variant={align === 'left' ? "default" : "ghost"}
                  className={`h-7 w-7 p-0 ${align === 'left' ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  onClick={() => handleAlignChange('left')}
                  title="Balra igazítás"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={align === 'center' ? "default" : "ghost"}
                  className={`h-7 w-7 p-0 ${align === 'center' ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  onClick={() => handleAlignChange('center')}
                  title="Középre igazítás"
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={align === 'right' ? "default" : "ghost"}
                  className={`h-7 w-7 p-0 ${align === 'right' ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  onClick={() => handleAlignChange('right')}
                  title="Jobbra igazítás"
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-gray-600" />
                <Select value={float} onValueChange={handleFloatChange}>
                  <SelectTrigger className="h-7 w-24 text-xs bg-transparent border-gray-600 text-gray-300 hover:text-white">
                    <span className="truncate">{float === 'none' ? 'Sorban' : float === 'left' ? 'Balra' : 'Jobbra'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sorban</SelectItem>
                    <SelectItem value="left">Balra úsztatás</SelectItem>
                    <SelectItem value="right">Jobbra úsztatás</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            
            <div className="w-px h-5 bg-gray-600" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/50"
              onClick={deleteImage}
              title="Kép törlése"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        {/* Size indicator */}
        <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-xs bg-gray-900/80 text-white px-2 py-1 rounded">
            {Math.round(size.width)} × {Math.round(size.height)} • {Math.round(rotation)}°
          </span>
        </div>
      </div>
      {children}
    </div>
  );
});

const AnimationElement = forwardRef(({ attributes, children, element }: any, ref) => {
  const editor = useSlate();
  const selected = useSelected();
  const focused = useFocused();
  const animRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: element.width || 640, height: element.height || 480 });
  const [rotation, setRotation] = useState(element.rotation || 0);
  const [float, setFloat] = useState(element.float || 'none');
  const [align, setAlign] = useState(element.align || 'left');
  const [position, setPosition] = useState(element.position || { x: 0, y: 0 });
  const [isAbsolute, setIsAbsolute] = useState(element.isAbsolute || false);
  
  // Refs for smooth dragging/resizing
  const dragStateRef = useRef({
    isDragging: false,
    isResizing: false,
    isRotating: false,
    resizeCorner: '',
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startRotation: 0,
    startPosX: 0,
    startPosY: 0,
    aspectRatio: 1,
  });

  // Get parent block alignment
  let parentAlign = align;
  try {
    const path = ReactEditor.findPath(editor, element);
    const [parentNode] = Editor.parent(editor, path);
    parentAlign = (parentNode as any)?.align || align;
  } catch (e) {}

  // Unified mouse handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      
      if (state.isResizing) {
        e.preventDefault();
        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;
        
        let newWidth = state.startWidth;
        let newHeight = state.startHeight;
        
        if (state.resizeCorner.includes('e')) newWidth = Math.max(100, state.startWidth + deltaX);
        else if (state.resizeCorner.includes('w')) newWidth = Math.max(100, state.startWidth - deltaX);
        
        if (state.resizeCorner.includes('s')) newHeight = Math.max(100, state.startHeight + deltaY);
        else if (state.resizeCorner.includes('n')) newHeight = Math.max(100, state.startHeight - deltaY);
        
        if (e.shiftKey || state.resizeCorner === 'se' || state.resizeCorner === 'nw') {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = Math.round(newWidth / state.aspectRatio);
          } else {
            newWidth = Math.round(newHeight * state.aspectRatio);
          }
        }
        
        setSize({ width: newWidth, height: newHeight });
      }
      
      if (state.isRotating) {
        e.preventDefault();
        if (!animRef.current) return;
        
        const rect = animRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const startAngle = Math.atan2(state.startY - centerY, state.startX - centerX);
        const deltaAngle = ((angle - startAngle) * 180) / Math.PI;
        
        let newRotation = state.startRotation + deltaAngle;
        if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
        
        setRotation(newRotation);
      }
      
      if (state.isDragging) {
        e.preventDefault();
        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;
        setPosition({ x: state.startPosX + deltaX, y: state.startPosY + deltaY });
      }
    };

    const handleMouseUp = () => {
      const state = dragStateRef.current;
      
      if (state.isResizing || state.isRotating || state.isDragging) {
        try {
          const path = ReactEditor.findPath(editor, element);
          if (state.isResizing) Transforms.setNodes(editor, { width: size.width, height: size.height }, { at: path });
          if (state.isRotating) Transforms.setNodes(editor, { rotation }, { at: path });
          if (state.isDragging) Transforms.setNodes(editor, { position } as any, { at: path });
        } catch (e) {}
        
        state.isDragging = false;
        state.isResizing = false;
        state.isRotating = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor, element, size, rotation, position]);

  const startResize = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    const state = dragStateRef.current;
    state.isResizing = true;
    state.resizeCorner = corner;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startWidth = size.width;
    state.startHeight = size.height;
    state.aspectRatio = size.width / size.height;
    document.body.style.cursor = corner === 'se' || corner === 'nw' ? 'nwse-resize' : 'nesw-resize';
    document.body.style.userSelect = 'none';
  };

  const startRotate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = dragStateRef.current;
    state.isRotating = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startRotation = rotation;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const startDrag = (e: React.MouseEvent) => {
    if (!isAbsolute) return;
    e.preventDefault();
    e.stopPropagation();
    const state = dragStateRef.current;
    state.isDragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startPosX = position.x;
    state.startPosY = position.y;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleFloatChange = (newFloat: string) => {
    setFloat(newFloat);
    setIsAbsolute(newFloat === 'absolute');
    const path = ReactEditor.findPath(editor, element);
    
    if (newFloat === 'absolute') {
      Transforms.setNodes(editor, { float: 'none', isAbsolute: true } as any, { at: path });
    } else {
      Transforms.setNodes(editor, { float: newFloat, isAbsolute: false, position: { x: 0, y: 0 } } as any, { at: path });
    }
  };

  const handleAlignChange = (newAlign: string) => {
    setAlign(newAlign);
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(editor, { align: newAlign }, { at: path });
  };

  const deleteAnimation = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, { at: path });
  };

  const isSelected = selected && focused;

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
        zIndex: isAbsolute ? 10 : undefined,
        display: isAbsolute ? 'block' : float === 'none' ? 'block' : 'inline-block',
        textAlign: !isAbsolute && float === 'none' ? parentAlign as any : undefined,
      }}
    >
      <div 
        ref={animRef}
        className="relative" 
        style={{ 
          display: 'inline-block',
          transform: `rotate(${rotation}deg)`,
        }}
      >
        <video
          src={element.url}
          autoPlay
          loop
          muted
          playsInline
          draggable={false}
          style={{
            width: size.width,
            height: size.height,
            maxWidth: 'none',
            objectFit: 'cover',
            cursor: isAbsolute ? 'grab' : 'default',
          }}
          className={`block transition-shadow ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : 'group-hover:ring-2 group-hover:ring-purple-300 group-hover:ring-offset-1'}`}
          onMouseDown={startDrag}
        />
        
        {/* Resize handles */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-purple-500 rounded-full cursor-nw-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all" onMouseDown={(e) => startResize(e, 'nw')} />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full cursor-ne-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all" onMouseDown={(e) => startResize(e, 'ne')} />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-500 rounded-full cursor-sw-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all" onMouseDown={(e) => startResize(e, 'sw')} />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 rounded-full cursor-se-resize pointer-events-auto shadow-md hover:bg-purple-600 hover:scale-110 transition-all" onMouseDown={(e) => startResize(e, 'se')} />
          
          {/* Rotation handle */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto" onMouseDown={startRotate}>
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full cursor-grab shadow-lg hover:from-purple-600 hover:to-purple-800 hover:scale-110 transition-all flex items-center justify-center">
              <RotateCw className="h-3 w-3 text-white" />
            </div>
            <div className="w-0.5 h-4 bg-purple-500" />
          </div>
        </div>
        
        {/* Floating toolbar */}
        <div className={`absolute -top-12 left-0 transition-all ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
          <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm rounded-lg p-1.5 shadow-xl border border-gray-700">
            <Select value={isAbsolute ? 'absolute' : float} onValueChange={handleFloatChange}>
              <SelectTrigger className="h-7 w-24 text-xs bg-transparent border-gray-600 text-gray-300 hover:text-white">
                <span className="truncate">{isAbsolute ? 'Abszolút' : float === 'none' ? 'Normál' : float === 'left' ? 'Bal' : 'Jobb'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Normál</SelectItem>
                <SelectItem value="left">Bal</SelectItem>
                <SelectItem value="right">Jobb</SelectItem>
                <SelectItem value="absolute">Abszolút</SelectItem>
              </SelectContent>
            </Select>
            
            {!isAbsolute && (
              <>
                <div className="w-px h-5 bg-gray-600" />
                <Button
                  size="sm"
                  variant={align === 'left' ? "default" : "ghost"}
                  className={`h-7 w-7 p-0 ${align === 'left' ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  onClick={() => handleAlignChange('left')}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={align === 'center' ? "default" : "ghost"}
                  className={`h-7 w-7 p-0 ${align === 'center' ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  onClick={() => handleAlignChange('center')}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={align === 'right' ? "default" : "ghost"}
                  className={`h-7 w-7 p-0 ${align === 'right' ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  onClick={() => handleAlignChange('right')}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            
            <div className="w-px h-5 bg-gray-600" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/50"
              onClick={deleteAnimation}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        {/* Size indicator */}
        <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-xs bg-gray-900/80 text-white px-2 py-1 rounded">
            {Math.round(size.width)} × {Math.round(size.height)} • {Math.round(rotation)}°
          </span>
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

  if (leaf.superscript) {
    children = <sup>{children}</sup>;
  }

  if (leaf.subscript) {
    children = <sub>{children}</sub>;
  }

  const style: any = {};
  
  if (leaf.color) {
    style.color = leaf.color;
  }
  
  if (leaf.backgroundColor) {
    style.backgroundColor = leaf.backgroundColor;
  }

  if (leaf.fontSize) {
    style.fontSize = leaf.fontSize;
  }

  if (leaf.fontFamily) {
    style.fontFamily = leaf.fontFamily;
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