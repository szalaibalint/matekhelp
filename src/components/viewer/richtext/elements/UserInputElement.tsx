import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Check, X, Plus } from 'lucide-react';

const UserInputElement = ({ attributes, element, children, isEditor = false, onAnswer, slideIndex, elementIndex, userAnswer, onEditClick, onFieldChange }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editPoints, setEditPoints] = useState<number>(10);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');

  useEffect(() => {
    if (isEditing) {
      setEditPlaceholder(element.placeholder || '___');
      setEditPoints(element.points || 10);
      // Parse multiple answers separated by |
      const answers = element.correctAnswer ? element.correctAnswer.split('|') : [''];
      setCorrectAnswers(answers);
    }
  }, [isEditing, element]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onFieldChange) {
      const combinedAnswer = correctAnswers.filter(a => a.trim()).join('|');
      onFieldChange({
        placeholder: editPlaceholder,
        correctAnswer: combinedAnswer,
        points: editPoints,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const addAnswer = () => {
    if (currentAnswer.trim()) {
      setCorrectAnswers([...correctAnswers, currentAnswer.trim()]);
      setCurrentAnswer('');
    }
  };

  const removeAnswer = (index: number) => {
    setCorrectAnswers(correctAnswers.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentAnswer.trim()) {
        addAnswer();
      } else {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditor) {
    return (
      <Popover open={isEditing} onOpenChange={(open) => !open && handleCancel()}>
        <PopoverTrigger asChild>
          <span
            {...attributes}
            contentEditable={false}
            onClick={handleStartEdit}
            className="inline-block bg-purple-50 hover:bg-purple-100 border-b-2 border-purple-400 rounded-t px-3 py-0.5 mx-0.5 cursor-pointer transition-colors min-w-[80px] text-center"
            title="Kattints a szerkesztéshez"
          >
            <span className="text-gray-400 text-sm">{element.placeholder || '___'}</span>
            {children}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Kitöltendő mező szerkesztése</div>
            
            {/* Placeholder */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Megjelenített szöveg (opcionális)</Label>
              <Input
                value={editPlaceholder}
                onChange={(e) => setEditPlaceholder(e.target.value)}
                placeholder="pl. ___"
                className="text-sm h-8"
              />
            </div>

            {/* Correct Answers */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Helyes válasz(ok)</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {correctAnswers.map((answer, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs"
                  >
                    <span>{answer}</span>
                    <button
                      onClick={() => removeAnswer(index)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Új válasz hozzáadása"
                  className="text-sm h-8 flex-1"
                />
                <Button size="sm" variant="outline" onClick={addAnswer} className="h-8 px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-gray-500">
                Több elfogadható válasz esetén mindegyik helyes. Használj \ karaktert több mező esetén (pl. "a\b").
              </p>
            </div>

            {/* Points */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Pontszám</Label>
              <Input
                type="number"
                value={editPoints}
                onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                className="text-sm h-8 w-20"
                min={0}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
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

  // Check if we need to create multiple input fields (backslash separator)
  const hasMultipleFields = element.correctAnswer && element.correctAnswer.includes('\\');

  if (hasMultipleFields) {
    // First, check if we have multiple answer options (pipe separator)
    // If we do, we need to split each answer option by backslash
    const hasMultipleOptions = element.correctAnswer.includes('|');
    
    let fieldCount = 0;
    if (hasMultipleOptions) {
      // Take the first answer option to determine field count
      const firstOption = element.correctAnswer.split('|')[0];
      fieldCount = firstOption.split('\\').length;
    } else {
      fieldCount = element.correctAnswer.split('\\').length;
    }
    
    const userAnswers = userAnswer ? userAnswer.split('\\') : [];

    const handleMultiAnswerChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const newAnswers = [...userAnswers];
      newAnswers[index] = e.target.value;
      onAnswer(newAnswers.join('\\'), slideIndex, elementIndex);
    };

    return (
      <span {...attributes} contentEditable={false} className="inline-block">
        {Array.from({ length: fieldCount }).map((_, index) => (
          <React.Fragment key={index}>
            <input
              type="text"
              placeholder={element.placeholder || ''}
              className="inline-block min-w-[80px] border-b-2 border-gray-400 focus:border-blue-500 outline-none text-center bg-transparent px-3 py-0.5 mx-0.5"
              value={userAnswers[index] || ''}
              onChange={(e) => handleMultiAnswerChange(e, index)}
            />
            {index < fieldCount - 1 && <span className="mx-1">/</span>}
          </React.Fragment>
        ))}
        {children}
      </span>
    );
  }

  return (
    <span {...attributes} contentEditable={false} className="inline-block">
      <input
        type="text"
        placeholder={element.placeholder || '___'}
        className="inline-block min-w-[80px] border-b-2 border-gray-400 focus:border-blue-500 outline-none text-center bg-transparent px-3 py-0.5 mx-0.5"
        value={userAnswer || ''}
        onChange={(e) => onAnswer(e.target.value, slideIndex, elementIndex)}
      />
      {children}
    </span>
  );
};

export default UserInputElement;
