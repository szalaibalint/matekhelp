import React, { useEffect, useState } from 'react';

interface MathElementProps {
  attributes: any;
  element: any; // Slate element with { type: 'math-inline', formula: string, displayMode?: boolean }
  children: any;
  isEditor?: boolean;
  onFormulaChange?: (formula: string) => void;
}

// Lazy-load katex to keep initial bundle small
let katexPromise: Promise<typeof import('katex')> | null = null;
const loadKatex = () => {
  if (!katexPromise) {
    katexPromise = import('katex');
  }
  return katexPromise;
};

export const MathElement: React.FC<MathElementProps> = ({ attributes, element, children, isEditor, onFormulaChange }) => {
  const [html, setHtml] = useState<string>('');
  const formula: string = element.formula || '';
  const displayMode = !!element.displayMode;

  useEffect(() => {
    let cancelled = false;
    loadKatex().then(katex => {
      if (cancelled) return;
      try {
        const rendered = katex.renderToString(formula || ' \\	ext{}', {
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

  if (isEditor) {
    return (
      <span
        {...attributes}
        contentEditable={false}
        className="inline-flex items-center bg-yellow-50 border border-yellow-300 rounded px-1 py-0.5 mx-0.5 text-sm font-mono group"
      >
        <span
          className="min-w-[20px] px-1"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <input
          type="text"
            className="ml-1 w-40 bg-transparent outline-none border-none text-xs font-mono focus:ring-0"
          value={formula}
          placeholder="e.g. \sin(x) + \sqrt{a}"
          onChange={(e) => onFormulaChange && onFormulaChange(e.target.value)}
        />
        <span style={{ display: 'none' }}>{children}</span>
      </span>
    );
  }

  return (
    <span {...attributes} contentEditable={false} className="inline-flex items-center">
      <span
        className="inline-block align-middle mx-0.5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <span style={{ display: 'none' }}>{children}</span>
    </span>
  );
};

export default MathElement;
