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
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link,
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
    duplicate,
    deleteSelected,
    undo,
    redo,
    selectedShapeIds,
    history,
    editingTextId,
    presentation,
    currentSlideId,
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

  const applyCommand = (command: string, value?: string) => {
    const canvasApplyCommand = (window as any).canvasApplyCommand;
    if (canvasApplyCommand) {
      canvasApplyCommand(command, value);
    }
  };

  // Check if currently editing text
  const currentSlide = presentation?.getSlide(currentSlideId || '');
  const editingShape = editingTextId && currentSlide
    ? currentSlide.getShape(editingTextId)
    : null;
  const isEditingText = editingShape?.type === ShapeType.TEXT;

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
        {/* Common Tools - Always visible */}
        <div className="toolbar-island">
          <div className="toolbar-section">
            {tools.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                className={`toolbar-btn ${tool === type ? 'active' : ''}`}
                onClick={() => handleToolClick(type)}
                title={label}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Shape Tools Island - Show when not editing text */}
        {!isEditingText && (
          <div className="toolbar-island">
            <div className="toolbar-section">
              {shapes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  className="toolbar-btn"
                  onClick={() => handleToolClick(ToolType.SELECT, type)}
                  title={label}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Formatting Island - Show when editing text */}
        {isEditingText && (
          <div className="toolbar-island">
            <div className="toolbar-section">
              <button className="toolbar-btn" onClick={() => applyCommand('bold')} title="Bold (Ctrl+B)">
                <Bold size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('italic')} title="Italic (Ctrl+I)">
                <Italic size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('underline')} title="Underline (Ctrl+U)">
                <Underline size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('strikeThrough')} title="Strikethrough">
                <Strikethrough size={16} />
              </button>
            </div>
            
            <div className="toolbar-section">
              <button className="toolbar-btn" onClick={() => applyCommand('justifyLeft')} title="Align Left">
                <AlignLeft size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('justifyCenter')} title="Align Center">
                <AlignCenter size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('justifyRight')} title="Align Right">
                <AlignRight size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('justifyFull')} title="Justify">
                <AlignJustify size={16} />
              </button>
            </div>

            <div className="toolbar-section">
              <button className="toolbar-btn" onClick={() => applyCommand('insertUnorderedList')} title="Bullet List">
                <List size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('insertOrderedList')} title="Numbered List">
                <ListOrdered size={16} />
              </button>
            </div>

            <div className="toolbar-section">
              <select
                className="toolbar-select"
                defaultValue="Arial"
                onChange={(e) => applyCommand('fontName', e.target.value)}
                title="Font Family"
              >
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Trebuchet MS">Trebuchet</option>
                <option value="Courier New">Courier</option>
              </select>
              <select
                className="toolbar-select"
                defaultValue="4"
                onChange={(e) => applyCommand('fontSize', e.target.value)}
                title="Font Size"
              >
                <option value="1">Tiny</option>
                <option value="2">Small</option>
                <option value="3">Normal</option>
                <option value="4">Large</option>
                <option value="5">X-Large</option>
                <option value="6">XX-Large</option>
                <option value="7">Huge</option>
              </select>
            </div>

            <div className="toolbar-section">
              <label className="toolbar-color-picker" title="Text Color">
                <input
                  type="color"
                  onChange={(e) => applyCommand('foreColor', e.target.value)}
                />
              </label>
              <label className="toolbar-color-picker" title="Highlight Color">
                <input
                  type="color"
                  defaultValue="#ffff00"
                  onChange={(e) => applyCommand('hiliteColor', e.target.value)}
                />
              </label>
            </div>

            <div className="toolbar-section">
              <button
                className="toolbar-btn"
                onClick={() => {
                  const url = window.prompt('Enter link URL:');
                  if (url) applyCommand('createLink', url);
                }}
                title="Insert Link"
              >
                <Link size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => applyCommand('removeFormat')} title="Clear Formatting">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Edit Actions Island - Always visible */}
        <div className="toolbar-island">
          <div className="toolbar-section">
            <button 
              className="toolbar-btn" 
              onClick={undo} 
              disabled={history.past.length === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button 
              className="toolbar-btn" 
              onClick={redo} 
              disabled={history.future.length === 0}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={16} />
            </button>
            <button
              className="toolbar-btn"
              onClick={duplicate}
              disabled={selectedShapeIds.length === 0}
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={16} />
            </button>
            <button
              className="toolbar-btn"
              onClick={deleteSelected}
              disabled={selectedShapeIds.length === 0}
              title="Delete (Del)"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Zoom Controls Island - Always visible */}
        <div className="toolbar-island">
          <div className="toolbar-section">
            <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom Out (-)">
              <ZoomOut size={16} />
            </button>
            <span className="toolbar-zoom-label">{Math.round(zoom * 100)}%</span>
            <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom In (+)">
              <ZoomIn size={16} />
            </button>
            <button className="toolbar-btn" onClick={resetView} title="Reset View (0)">
              Reset
            </button>
          </div>
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
