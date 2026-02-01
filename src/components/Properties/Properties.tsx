import React from 'react';
import { useEditorStore } from '../../stores/editorStore';

export const Properties: React.FC = () => {
  const { presentation, currentSlideId, selectedShapeIds, updateShape, version } = useEditorStore();

  const currentSlide = presentation?.getSlide(currentSlideId || '');
  const selectedShape = selectedShapeIds.length === 1
    ? currentSlide?.getShape(selectedShapeIds[0])
    : null;

  console.group('🔵 PROPERTIES RENDER');
  console.log('Version:', version);
  console.log('Selected Shape ID:', selectedShapeIds[0]);
  if (selectedShape) {
    console.log('Shape Rotation:', selectedShape.transform.rotation);
    console.log('Shape Position:', selectedShape.transform.position);
    console.log('Shape Size:', selectedShape.transform.size);
    console.log('Shape Opacity:', selectedShape.opacity);
  }
  console.groupEnd();

  if (!selectedShape) {
    return (
      <div className="properties">
        <div className="properties-header">
          <h3>Properties</h3>
        </div>
        <div className="properties-empty">
          <p>Select a shape to edit its properties</p>
        </div>
      </div>
    );
  }

  const handleColorChange = (property: 'fill' | 'stroke', value: string) => {
    updateShape(selectedShape.id, {
      color: { ...selectedShape.color, [property]: value },
    });
  };

  const handleStrokeWidthChange = (value: number) => {
    updateShape(selectedShape.id, {
      color: { ...selectedShape.color, strokeWidth: value },
    });
  };

  const handleOpacityChange = (value: number) => {
    updateShape(selectedShape.id, { opacity: value });
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    updateShape(selectedShape.id, {
      transform: {
        ...selectedShape.transform,
        position: {
          ...selectedShape.transform.position,
          [axis]: value,
        },
      },
    });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    updateShape(selectedShape.id, {
      transform: {
        ...selectedShape.transform,
        size: {
          ...selectedShape.transform.size,
          [dimension]: Math.max(1, value),
        },
      },
    });
  };

  const handleRotationChange = (value: number) => {
    console.log('🟡 ROTATION CHANGE:', value);
    updateShape(selectedShape.id, {
      transform: {
        ...selectedShape.transform,
        rotation: value,
      },
    });
  };

  return (
    <div className="properties">
      <div className="properties-header">
        <h3>Properties</h3>
      </div>

      <div className="properties-content">
        {/* Position */}
        <div className="property-group">
          <label className="property-label">Position</label>
          <div className="property-row">
            <div className="property-input-group">
              <label>X</label>
              <input
                type="number"
                value={Math.round(selectedShape.transform.position.x)}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
              />
            </div>
            <div className="property-input-group">
              <label>Y</label>
              <input
                type="number"
                value={Math.round(selectedShape.transform.position.y)}
                onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="property-group">
          <label className="property-label">Size</label>
          <div className="property-row">
            <div className="property-input-group">
              <label>W</label>
              <input
                type="number"
                value={Math.round(selectedShape.transform.size.width)}
                onChange={(e) => handleSizeChange('width', parseFloat(e.target.value))}
              />
            </div>
            <div className="property-input-group">
              <label>H</label>
              <input
                type="number"
                value={Math.round(selectedShape.transform.size.height)}
                onChange={(e) => handleSizeChange('height', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div className="property-group">
          <label className="property-label">Rotation</label>
          <input
            type="range"
            min="0"
            max="360"
            value={selectedShape.transform.rotation}
            onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
          />
          <span>{Math.round(selectedShape.transform.rotation)}°</span>
        </div>

        {/* Colors */}
        <div className="property-group">
          <label className="property-label">Fill Color</label>
          <input
            type="color"
            value={selectedShape.color.fill}
            onChange={(e) => handleColorChange('fill', e.target.value)}
          />
        </div>

        <div className="property-group">
          <label className="property-label">Stroke Color</label>
          <input
            type="color"
            value={selectedShape.color.stroke}
            onChange={(e) => handleColorChange('stroke', e.target.value)}
          />
        </div>

        <div className="property-group">
          <label className="property-label">Stroke Width</label>
          <input
            type="range"
            min="0"
            max="20"
            value={selectedShape.color.strokeWidth}
            onChange={(e) => handleStrokeWidthChange(parseFloat(e.target.value))}
          />
          <span>{selectedShape.color.strokeWidth}px</span>
        </div>

        {/* Opacity */}
        <div className="property-group">
          <label className="property-label">Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedShape.opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
          />
          <span>{Math.round(selectedShape.opacity * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
