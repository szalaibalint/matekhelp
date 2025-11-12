import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface MathFormulaInsertProps {
  onInsert: (formula: string) => void;
}

// Quick insert buttons for common math functions
const FUNCTION_SHORTCUTS = [
  { label: 'sin(x)', formula: '\\sin(x)' },
  { label: 'cos(x)', formula: '\\cos(x)' },
  { label: 'tan(x)', formula: '\\tan(x)' },
  { label: 'cot(x)', formula: '\\cot(x)' },
  { label: 'sec(x)', formula: '\\sec(x)' },
  { label: 'csc(x)', formula: '\\csc(x)' },
  { label: '√x', formula: '\\sqrt{x}' },
  { label: 'ⁿ√x', formula: '\\sqrt[n]{x}' },
  { label: 'x²', formula: 'x^{2}' },
  { label: 'xⁿ', formula: 'x^{n}' },
  { label: 'log x', formula: '\\log(x)' },
  { label: 'ln x', formula: '\\ln(x)' },
  { label: '∫', formula: '\\int' },
  { label: '∫ₐᵇ', formula: '\\int_{a}^{b}' },
  { label: '∑', formula: '\\sum' },
  { label: '∑ₐᵇ', formula: '\\sum_{a}^{b}' },
  { label: '∏', formula: '\\prod' },
  { label: 'lim', formula: '\\lim_{x \\to \\infty}' },
  { label: 'd/dx', formula: '\\frac{d}{dx}' },
  { label: '∂/∂x', formula: '\\frac{\\partial}{\\partial x}' },
  { label: 'π', formula: '\\pi' },
  { label: '∞', formula: '\\infty' },
  { label: '±', formula: '\\pm' },
  { label: '≤', formula: '\\leq' },
  { label: '≥', formula: '\\geq' },
  { label: '≠', formula: '\\neq' },
  { label: '≈', formula: '\\approx' },
  { label: '÷', formula: '\\div' },
  { label: '×', formula: '\\times' },
  { label: 'fraction', formula: '\\frac{a}{b}' },
];

export const MathFormulaInsert: React.FC<MathFormulaInsertProps> = ({ onInsert }) => {
  const [formula, setFormula] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInsert = () => {
    if (formula.trim()) {
      onInsert(formula);
      setFormula('');
      setCursorPosition(0);
    }
  };

  const insertShortcut = (shortcutFormula: string) => {
    // Insert at cursor position
    const before = formula.substring(0, cursorPosition);
    const after = formula.substring(cursorPosition);
    const newFormula = before + shortcutFormula + after;
    const newCursorPos = cursorPosition + shortcutFormula.length;
    
    setFormula(newFormula);
    setCursorPosition(newCursorPos);
    
    // Focus and set cursor position after state updates
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormula(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    setCursorPosition((e.target as HTMLInputElement).selectionStart || 0);
  };

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCursorPosition((e.target as HTMLInputElement).selectionStart || 0);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium mb-2">LaTeX képlet</label>
        <Input
          ref={inputRef}
          placeholder="Írj be egy LaTeX képletet (pl. \sin(x) + \sqrt{a})"
          value={formula}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onKeyUp={handleInputKeyUp}
          className="font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">
          Használj LaTeX szintaxist. Példa: \sin(x), \frac{'{a}'}{'{b}'}, \sqrt{'{x}'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Gyors beillesztés</label>
        <div className="grid grid-cols-6 gap-1">
          {FUNCTION_SHORTCUTS.map((shortcut, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => insertShortcut(shortcut.formula)}
              className="text-xs h-8"
              type="button"
            >
              {shortcut.label}
            </Button>
          ))}
        </div>
      </div>

      <Button onClick={handleInsert} disabled={!formula.trim()} className="w-full">
        Beillesztés
      </Button>
    </div>
  );
};
