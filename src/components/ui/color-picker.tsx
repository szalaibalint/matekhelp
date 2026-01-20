import React from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';

interface ColorPickerProps {
  color: string;
  onChange?: (color: { hex: string }) => void;
  onChangeComplete?: (color: { hex: string }) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onChangeComplete }) => {
  // Use the color prop directly instead of internal state to stay in sync
  const currentColor = color || '#ffffff';

  const handleChange = (newColor: string) => {
    if (onChange) {
      onChange({ hex: newColor });
    }
    // Also call onChangeComplete for compatibility with react-color API
    if (onChangeComplete) {
      onChangeComplete({ hex: newColor });
    }
  };

  return (
    <div className="p-3 space-y-3">
      <HexColorPicker color={currentColor} onChange={handleChange} />
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">#</span>
        <HexColorInput
          color={currentColor}
          onChange={handleChange}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
          prefixed={false}
        />
        <div
          className="w-8 h-8 rounded border border-gray-300 shadow-inner"
          style={{ backgroundColor: currentColor }}
        />
      </div>
    </div>
  );
};

// Alias for easy migration from SketchPicker
export { ColorPicker as SketchPicker };
