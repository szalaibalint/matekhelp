import React, { useEffect, useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Check, X } from 'lucide-react';

interface MathElementProps {
  attributes: any;
  element: any; // Slate element with { type: 'math-inline', formula: string, displayMode?: boolean, fontSize?: string }
  children: any;
  isEditor?: boolean;
  onFormulaChange?: (formula: string) => void;
  onFontSizeChange?: (fontSize: string) => void;
}

// Lazy-load katex to keep initial bundle small
let katexPromise: Promise<typeof import('katex')> | null = null;
let katexInstance: typeof import('katex') | null = null;

const loadKatex = () => {
  if (!katexPromise) {
    katexPromise = import('katex').then(k => {
      katexInstance = k;
      return k;
    });
  }
  return katexPromise;
};

export const MathElement: React.FC<MathElementProps> = ({ attributes, element, children, isEditor, onFormulaChange, onFontSizeChange }) => {
  const [html, setHtml] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editFontSize, setEditFontSize] = useState('');
  const formula: string = element.formula || '';
  const displayMode = !!element.displayMode;
  const fontSize: string = element.fontSize || '16px';

  useEffect(() => {
    let cancelled = false;
    loadKatex().then(katex => {
      if (cancelled) return;
      try {
        const rendered = katex.renderToString(formula || '\\text{ }', {
          throwOnError: false,
          displayMode,
          output: 'html'
        });
        setHtml(rendered);
      } catch (e) {
        setHtml(`<span style=\"color:#dc2626\">${formula}</span>`);
      }
    });
    return () => { cancelled = true; };
  }, [formula, displayMode]);

  // Update preview when editValue changes
  useEffect(() => {
    if (!isEditing || !editValue) {
      setPreviewHtml('');
      return;
    }
    
    if (katexInstance) {
      try {
        const rendered = katexInstance.renderToString(editValue, {
          throwOnError: false,
          displayMode: false,
          output: 'html'
        });
        setPreviewHtml(rendered);
      } catch (e) {
        setPreviewHtml(`<span style="color:#dc2626">${editValue}</span>`);
      }
    } else {
      loadKatex().then(katex => {
        try {
          const rendered = katex.renderToString(editValue, {
            throwOnError: false,
            displayMode: false,
            output: 'html'
          });
          setPreviewHtml(rendered);
        } catch (e) {
          setPreviewHtml(`<span style="color:#dc2626">${editValue}</span>`);
        }
      });
    }
  }, [editValue, isEditing]);

  const handleStartEdit = () => {
    setEditValue(formula);
    setEditFontSize(fontSize);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onFormulaChange) {
      onFormulaChange(editValue);
    }
    if (onFontSizeChange && editFontSize !== fontSize) {
      onFontSizeChange(editFontSize);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(formula);
    setEditFontSize(fontSize);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const fontSizeOptions = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];

  if (isEditor) {
    return (
      <Popover open={isEditing} onOpenChange={(open) => !open && handleCancel()}>
        <PopoverTrigger asChild>
          <span
            {...attributes}
            contentEditable={false}
            onClick={handleStartEdit}
            className="inline bg-yellow-100 hover:bg-yellow-200 rounded px-0.5 cursor-pointer transition-colors"
            style={{ border: '1px solid #fbbf24', fontSize }}
            title="Kattints a szerkesztéshez"
          >
            <span dangerouslySetInnerHTML={{ __html: html }} />
            <span style={{ display: 'none' }}>{children}</span>
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Matematikai képlet szerkesztése</div>
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="pl. \sin(x) + \sqrt{a}"
              className="font-mono text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Betűméret:</span>
              <select
                value={editFontSize}
                onChange={(e) => setEditFontSize(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {fontSizeOptions.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            {previewHtml && (
              <div className="text-xs text-gray-500">
                <span>Előnézet: </span>
                <span 
                  className="inline-block text-black"
                  style={{ fontSize: editFontSize }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Mégse
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Mentés
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <span {...attributes} contentEditable={false} className="inline" style={{ fontSize }}>
      <span
        className="inline"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <span style={{ display: 'none' }}>{children}</span>
    </span>
  );
};

export default MathElement;
