import React, { useEffect, useState } from 'react';
import {
  Square,
  Circle,
  Triangle,
  Type,
  Image,
  Minus,
  ArrowRight,
  MousePointer2,
  Hand,
  Undo,
  Redo,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { ToolType, ShapeType } from '../../types';

export const Toolbar: React.FC = () => {
  const {
    tool,
    setTool,
    addShape,
    zoom,
    setZoom,
    resetView,
    copyShapes,
    deleteSelected,
    undo,
    redo,
    selectedShapeIds,
    history,
  } = useEditorStore();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);

  const getCenterPosition = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    return { x: centerX - 50, y: centerY - 50 };
  };

  const handleToolClick = (newTool: ToolType, shapeType?: ShapeType) => {
    setTool(newTool);

    // If it's a shape tool, add the shape immediately at center
    if (shapeType) {
      if (shapeType === ShapeType.IMAGE) {
        setImageUrlInput('');
        setImageUrlError(null);
        setIsImageModalOpen(true);
        return;
      }

      addShape(shapeType, getCenterPosition());
      setTool(ToolType.SELECT); // Return to select tool
    }
  };

  useEffect(() => {
    if (!isImageModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsImageModalOpen(false);
        setImageUrlError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen]);

  const handleInsertImage = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) {
      setImageUrlError('Please paste an image URL.');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      setImageUrlError('Please enter a valid http(s) image URL.');
      return;
    }

    addShape(ShapeType.IMAGE, getCenterPosition(), { imageUrl: trimmed });
    setTool(ToolType.SELECT);
    setIsImageModalOpen(false);
    setImageUrlError(null);
  };

  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);

  const tools = [
    { type: ToolType.SELECT, icon: MousePointer2, label: 'Select (V)' },
    { type: ToolType.PAN, icon: Hand, label: 'Pan (H)' },
  ];

  const shapes = [
    { type: ShapeType.RECTANGLE, icon: Square, label: 'Rectangle (R)' },
    { type: ShapeType.CIRCLE, icon: Circle, label: 'Circle (C)' },
    { type: ShapeType.TRIANGLE, icon: Triangle, label: 'Triangle (T)' },
    { type: ShapeType.TEXT, icon: Type, label: 'Text (T)' },
    { type: ShapeType.LINE, icon: Minus, label: 'Line (L)' },
    { type: ShapeType.ARROW, icon: ArrowRight, label: 'Arrow (A)' },
    { type: ShapeType.IMAGE, icon: Image, label: 'Image (I)' },
  ];

  return (
    <>
      <div className="toolbar">
        {/* Tools Section */}
        <div className="toolbar-section">
          {tools.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              className={`toolbar-btn ${tool === type ? 'active' : ''}`}
              onClick={() => handleToolClick(type)}
              title={label}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* Shapes Section */}
        <div className="toolbar-section">
          {shapes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              className="toolbar-btn"
              onClick={() => handleToolClick(ToolType.SELECT, type)}
              title={label}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* Edit Actions */}
        <div className="toolbar-section">
          <button 
            className="toolbar-btn" 
            onClick={undo} 
            disabled={history.past.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={20} />
          </button>
          <button 
            className="toolbar-btn" 
            onClick={redo} 
            disabled={history.future.length === 0}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={20} />
          </button>
          <button
            className="toolbar-btn"
            onClick={copyShapes}
            disabled={selectedShapeIds.length === 0}
            title="Copy (Ctrl+C)"
          >
            <Copy size={20} />
          </button>
          <button
            className="toolbar-btn"
            onClick={deleteSelected}
            disabled={selectedShapeIds.length === 0}
            title="Delete (Del)"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Zoom Controls */}
        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom Out (-)">
            <ZoomOut size={20} />
          </button>
          <span className="toolbar-zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom In (+)">
            <ZoomIn size={20} />
          </button>
          <button className="toolbar-btn" onClick={resetView} title="Reset View (0)">
            Reset
          </button>
        </div>
      </div>

      {isImageModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsImageModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Insert image</h3>
              <button
                className="modal-close"
                onClick={() => setIsImageModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label className="modal-label" htmlFor="image-url-input">Image URL</label>
              <input
                id="image-url-input"
                className={`modal-input ${imageUrlError ? 'modal-input-error' : ''}`}
                type="url"
                placeholder="https://example.com/image.png"
                value={imageUrlInput}
                onChange={(event) => {
                  setImageUrlInput(event.target.value);
                  setImageUrlError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleInsertImage();
                  }
                }}
              />
              {imageUrlError && <div className="modal-error">{imageUrlError}</div>}
              <p className="modal-hint">Some hosts block direct image loading. We will auto-try a proxy if needed.</p>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsImageModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleInsertImage}>
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
