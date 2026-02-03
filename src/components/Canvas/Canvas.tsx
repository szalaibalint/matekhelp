import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Text, Group, Circle, Arrow, Image as KonvaImage } from 'react-konva';
import { useEditorStore } from '../../stores/editorStore';
import { ShapeType, ToolType } from '../../types';
import Konva from 'konva';

const getPlainTextFromHtml = (value: string) => {
  if (!value) return '';
  if (!value.includes('<')) return value;
  try {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return doc.body.textContent || '';
  } catch {
    return value.replace(/<[^>]*>/g, '');
  }
};

interface CanvasShapeProps {
  shape: any;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isEditing?: boolean;
  onSelect: () => void;
  onChange: (updates: any) => void;
  onStart?: () => void;
  onEditText?: (shapeId: string) => void;
}

const CanvasShape: React.FC<CanvasShapeProps> = ({ shape, isSelected, isMultiSelected, isEditing, onSelect, onChange, onStart, onEditText }) => {
  // Add isMultiSelected to shape object for use in useEffect
  shape.isMultiSelected = isMultiSelected;
  const shapeRef = useRef<any>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const renderCount = useRef<number>(0);
  const lastRenderLog = useRef<number>(0);
  
  renderCount.current++;
  const now = Date.now();
  if (now - lastRenderLog.current > 1000) {
    console.log(`🔷 CanvasShape rendered ${renderCount.current} times in last second`);
    renderCount.current = 0;
    lastRenderLog.current = now;
  }
  
  const { tool } = useEditorStore();

  const getProxyUrl = (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;

  useEffect(() => {
    if (shape.type !== ShapeType.IMAGE) return;
    const url = shape.imageUrl?.trim();
    if (!url) {
      setImageElement(null);
      setImageFailed(false);
      return;
    }

    let isCancelled = false;
    let didFallback = false;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    const handleLoad = () => {
      if (isCancelled) return;
      setImageElement(img);
      setImageFailed(false);
    };

    const handleError = () => {
      if (isCancelled) return;
      if (!didFallback) {
        didFallback = true;
        img.src = getProxyUrl(url);
        return;
      }
      setImageElement(null);
      setImageFailed(true);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = url;

    return () => {
      isCancelled = true;
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [shape.type, shape.imageUrl]);

  // Only show individual transformer when this is the ONLY selected shape
  // Multi-selection will be handled by the group transformer in Canvas component
  useEffect(() => {
    // This prop will be passed from Canvas to indicate if multi-select is active
    const isSingleSelection = isSelected && !shape.isMultiSelected;
    
    if (isSingleSelection && shapeRef.current && tool === ToolType.SELECT) {
      const transformer = new Konva.Transformer({
        nodes: [shapeRef.current],
        keepRatio: false,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'middle-left', 'middle-right', 'bottom-center'],
        borderStrokeWidth: 1,
        anchorStrokeWidth: 1,
        anchorSize: 8,
        centeredScaling: false,
      });

      transformer.ignoreStroke(true);
      
      transformer.on('transform', () => {
        const stage = shapeRef.current.getStage();
        if (stage) {
          const isShiftPressed = stage.container().ownerDocument?.defaultView?.event?.shiftKey || false;
          transformer.keepRatio(isShiftPressed);
        }
      });
      
      shapeRef.current.getLayer().add(transformer);
      return () => {
        transformer.destroy();
      };
    }
  }, [isSelected, shape.id, shape.type, shape.isMultiSelected, imageElement, tool]);

  const handleDragMove = (e: any) => {
    // Lines use top-left positioning (no offset), other shapes use center-based positioning
    let newPosition;
    if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
      // Lines use top-left positioning, so node.x/y is already top-left
      newPosition = {
        x: e.target.x(),
        y: e.target.y(),
      };
    } else {
      // Other shapes use center-based positioning with offset
      // So node.x/y is at center, convert back to top-left for storage
      newPosition = {
        x: e.target.x() - shape.transform.size.width / 2,
        y: e.target.y() - shape.transform.size.height / 2,
      };
    }
    
    const updatePayload = {
      transform: {
        ...shape.transform,
        position: newPosition,
      },
    };
    onChange(updatePayload);
  };

  const handleDragEnd = (e: any) => {
    // Lines use top-left positioning (no offset), other shapes use center-based positioning
    let newPosition;
    if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
      // Lines use top-left positioning, so node.x/y is already top-left
      newPosition = {
        x: e.target.x(),
        y: e.target.y(),
      };
    } else {
      // Other shapes use center-based positioning with offset
      // So node.x/y is at center, convert back to top-left for storage
      newPosition = {
        x: e.target.x() - shape.transform.size.width / 2,
        y: e.target.y() - shape.transform.size.height / 2,
      };
    }
    
    
    const updatePayload = {
      transform: {
        ...shape.transform,
        position: newPosition,
      },
    };

    onChange(updatePayload);
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    const newWidth = Math.max(5, node.width() * scaleX);
    const newHeight = Math.max(5, node.height() * scaleY);
    const newSize = { width: newWidth, height: newHeight };
    
    // Lines use top-left positioning (no offset), other shapes use center-based positioning
    let newPosition;
    if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
      // Lines use top-left positioning, so node.x/y is already top-left
      newPosition = {
        x: node.x(),
        y: node.y(),
      };
    } else {
      // Other shapes use center-based positioning with offset
      // So node.x/y is at center, convert back to top-left for storage
      newPosition = {
        x: node.x() - newWidth / 2,
        y: node.y() - newHeight / 2,
      };
    }
    
    const newRotation = node.rotation();
    // Normalize rotation to 0-360 range
    const normalizedRotation = ((newRotation % 360) + 360) % 360;

    if (shape.type === ShapeType.TEXT) {
      const clientRect = node.getClientRect?.();
      console.log('🟦 TEXT RESIZE END', {
        id: shape.id,
        nodeX: node.x(),
        nodeY: node.y(),
        scaleX,
        scaleY,
        newWidth,
        newHeight,
        normalizedRotation,
        clientRect,
      });
    }

    node.scaleX(1);
    node.scaleY(1);
    
    // CRITICAL FIX: Update node dimensions to match new size
    // This ensures the next transform uses the correct base dimensions
    // Different shape types have different properties
    let newPoints: number[] | undefined;
    
    if (shape.type === ShapeType.CIRCLE) {
      // Ellipse uses radiusX and radiusY, allowing non-uniform sizing
      node.radiusX(newWidth / 2);
      node.radiusY(newHeight / 2);
    } else if (shape.type === ShapeType.TRIANGLE) {
      // Triangle is a Line shape - update its points array to match new dimensions
      newPoints = [
        0, newHeight,
        newWidth / 2, 0,
        newWidth, newHeight,
      ];
      node.points(newPoints);
    } else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
      // Lines and arrows use points array - scale existing points by scaleX and scaleY
      const oldPoints = shape.points || [0, 0, 100, 100];
      newPoints = oldPoints.map((coord: number, index: number) => 
        index % 2 === 0 ? coord * scaleX : coord * scaleY
      );
      node.points(newPoints);
    } else {
      // Rectangles, etc. use width/height
      node.width(newWidth);
      node.height(newHeight);
    }

    if (
      shape.type === ShapeType.RECTANGLE ||
      shape.type === ShapeType.TRIANGLE ||
      shape.type === ShapeType.TEXT ||
      shape.type === ShapeType.IMAGE
    ) {
      node.offsetX(newWidth / 2);
      node.offsetY(newHeight / 2);
    }
    
    const updatePayload: any = {
      transform: {
        ...shape.transform,
        position: newPosition,
        size: newSize,
        rotation: normalizedRotation,
      },
    };
    
    // Include updated points for shapes that use them
    if (newPoints !== undefined) {
      updatePayload.points = newPoints;
    }
    
    onChange(updatePayload);
  };

  const handleTransform = (e: any) => {
    const node = e.target;
    const rotation = node.rotation();
    if (shape.type === ShapeType.TEXT) {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rawWidth = node.width();
      const rawHeight = node.height();
      const clientRect = node.getClientRect?.();
      console.log('🟦 TEXT RESIZE (live)', {
        id: shape.id,
        nodeX: node.x(),
        nodeY: node.y(),
        scaleX,
        scaleY,
        rawWidth,
        rawHeight,
        calcWidth: rawWidth * scaleX,
        calcHeight: rawHeight * scaleY,
        rotation,
        clientRect,
        dataPos: shape.transform.position,
        dataSize: shape.transform.size,
      });
    }
    onChange({
      transform: {
        ...shape.transform,
        rotation,
      },
    });
  };

  const baseOpacity = shape.type === ShapeType.TEXT ? 0 : shape.opacity;

  const commonProps = {
    ref: shapeRef,
    id: `shape-${shape.id}`,
    name: 'shape',
    x: shape.transform.position.x,
    y: shape.transform.position.y,
    width: shape.transform.size.width,
    height: shape.transform.size.height,
    rotation: shape.transform.rotation,
    offsetX: 0,
    offsetY: 0,
    fill: shape.color.fill,
    stroke: shape.color.stroke,
    strokeWidth: shape.color.strokeWidth,
    strokeScaleEnabled: false, // Keep stroke width constant during transforms
    opacity: isEditing ? 0 : baseOpacity,
    draggable: !shape.locked && tool === ToolType.SELECT,
    onClick: tool === ToolType.SELECT ? onSelect : undefined,
    onTap: tool === ToolType.SELECT ? onSelect : undefined,
    onDragStart: onStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onTransformStart: onStart,
    onTransform: handleTransform,
    onTransformEnd: handleTransformEnd,
  };

  switch (shape.type) {
    case ShapeType.RECTANGLE:
      return (
        <Rect
          {...commonProps}
          x={shape.transform.position.x + shape.transform.size.width / 2}
          y={shape.transform.position.y + shape.transform.size.height / 2}
          offsetX={shape.transform.size.width / 2}
          offsetY={shape.transform.size.height / 2}
        />
      );
    
    case ShapeType.CIRCLE:
      // Use Ellipse to support non-uniform width/height (oval shapes)
      return (
        <Ellipse
          {...commonProps}
          radiusX={shape.transform.size.width / 2}
          radiusY={shape.transform.size.height / 2}
          x={shape.transform.position.x + shape.transform.size.width / 2}
          y={shape.transform.position.y + shape.transform.size.height / 2}
        />
      );
    
    case ShapeType.TRIANGLE:
      return (
        <Line
          {...commonProps}
          x={shape.transform.position.x + shape.transform.size.width / 2}
          y={shape.transform.position.y + shape.transform.size.height / 2}
          offsetX={shape.transform.size.width / 2}
          offsetY={shape.transform.size.height / 2}
          points={[
            0, shape.transform.size.height,
            shape.transform.size.width / 2, 0,
            shape.transform.size.width, shape.transform.size.height,
          ]}
          closed
        />
      );
    
    case ShapeType.TEXT: {
      const handleTextClick = () => {
        if (tool !== ToolType.SELECT) return;
        if (isSelected) {
          onEditText?.(shape.id);
        } else {
          onSelect();
        }
      };
      return (
        <Text
          {...commonProps}
          x={shape.transform.position.x + shape.transform.size.width / 2}
          y={shape.transform.position.y + shape.transform.size.height / 2}
          offsetX={shape.transform.size.width / 2}
          offsetY={shape.transform.size.height / 2}
          text={getPlainTextFromHtml(shape.text || 'Text')}
          fontSize={shape.fontSize || 24}
          fontFamily={shape.fontFamily || 'Arial'}
          onClick={handleTextClick}
          onTap={handleTextClick}
          onDblClick={() => onEditText?.(shape.id)}
          onDblTap={() => onEditText?.(shape.id)}
        />
      );
    }

    case ShapeType.IMAGE:
      if (!imageElement) {
        return (
          <Rect
            {...commonProps}
            x={shape.transform.position.x + shape.transform.size.width / 2}
            y={shape.transform.position.y + shape.transform.size.height / 2}
            offsetX={shape.transform.size.width / 2}
            offsetY={shape.transform.size.height / 2}
            fill={imageFailed ? '#ffe9e9' : '#f3f3f3'}
            stroke={imageFailed ? '#ff6b6b' : '#bbb'}
            dash={[6, 4]}
          />
        );
      }

      return (
        <KonvaImage
          {...commonProps}
          image={imageElement}
          x={shape.transform.position.x + shape.transform.size.width / 2}
          y={shape.transform.position.y + shape.transform.size.height / 2}
          offsetX={shape.transform.size.width / 2}
          offsetY={shape.transform.size.height / 2}
        />
      );
    
    case ShapeType.LINE:
    case ShapeType.ARROW: {
      const points = shape.points || [0, 0, 100, 100];
      // Calculate center of the line's bounding box for the move handle
      const minX = Math.min(points[0], points[2]);
      const maxX = Math.max(points[0], points[2]);
      const minY = Math.min(points[1], points[3]);
      const maxY = Math.max(points[1], points[3]);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const rotationRad = (shape.transform.rotation * Math.PI) / 180;
      const rotatedCenterX = centerX * Math.cos(rotationRad) - centerY * Math.sin(rotationRad);
      const rotatedCenterY = centerX * Math.sin(rotationRad) + centerY * Math.cos(rotationRad);
      
      const lineNode = shape.type === ShapeType.ARROW ? (
        <Arrow
          {...commonProps}
          points={points}
          pointerLength={10}
          pointerWidth={10}
        />
      ) : (
        <Line
          {...commonProps}
          points={points}
        />
      );

      return (
        <Group>
          {lineNode}
          {isSelected && tool === ToolType.SELECT && (
            <Group
              x={shape.transform.position.x + rotatedCenterX}
              y={shape.transform.position.y + rotatedCenterY}
              draggable={!shape.locked}
              onDragStart={onStart}
              onDragMove={(e) => {
                // Update line position in real-time while dragging
                const handleX = e.target.x();
                const handleY = e.target.y();
                const newLineX = handleX - rotatedCenterX;
                const newLineY = handleY - rotatedCenterY;

                onChange({
                  transform: {
                    ...shape.transform,
                    position: { x: newLineX, y: newLineY },
                  },
                });
              }}
              onDragEnd={(e) => {
                const handleX = e.target.x();
                const handleY = e.target.y();
                const newLineX = handleX - rotatedCenterX;
                const newLineY = handleY - rotatedCenterY;

                const updatePayload = {
                  transform: {
                    ...shape.transform,
                    position: { x: newLineX, y: newLineY },
                  },
                };

                onChange(updatePayload);
              }}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            >
              {/* Invisible hitbox for easier dragging */}
              <Rect
                x={-15}
                y={-15}
                width={30}
                height={30}
                fill="transparent"
              />
              {/* Crosshair move icon */}
              {/* Vertical line */}
              <Line
                points={[0, -10, 0, 10]}
                stroke="#4A90E2"
                strokeWidth={2}
                listening={false}
              />
              {/* Horizontal line */}
              <Line
                points={[-10, 0, 10, 0]}
                stroke="#4A90E2"
                strokeWidth={2}
                listening={false}
              />
              {/* Arrow heads - top */}
              <Line
                points={[-3, -7, 0, -10, 3, -7]}
                stroke="#4A90E2"
                strokeWidth={2}
                listening={false}
              />
              {/* Arrow heads - bottom */}
              <Line
                points={[-3, 7, 0, 10, 3, 7]}
                stroke="#4A90E2"
                strokeWidth={2}
                listening={false}
              />
              {/* Arrow heads - left */}
              <Line
                points={[-7, -3, -10, 0, -7, 3]}
                stroke="#4A90E2"
                strokeWidth={2}
                listening={false}
              />
              {/* Arrow heads - right */}
              <Line
                points={[7, -3, 10, 0, 7, 3]}
                stroke="#4A90E2"
                strokeWidth={2}
                listening={false}
              />
              {/* Center circle for better visibility */}
              <Circle
                x={0}
                y={0}
                radius={3}
                fill="#FFFFFF"
                stroke="#4A90E2"
                strokeWidth={2}
                listening={false}
              />
            </Group>
          )}
        </Group>
      );
    }

    default:
      return null;
  }
};

// Memoize to prevent re-renders when parent updates
const MemoizedCanvasShape = React.memo(CanvasShape, (prevProps, nextProps) => {
  // Re-render only if these props change
  return (
    prevProps.shape === nextProps.shape &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelected === nextProps.isMultiSelected &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onStart === nextProps.onStart &&
    prevProps.onEditText === nextProps.onEditText
  );
});

export const Canvas: React.FC = () => {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const selectionGroupRef = useRef<any>(null);
  const textEditorRef = useRef<HTMLDivElement | null>(null);
  const canvasRenderCount = useRef<number>(0);
  const lastCanvasRenderLog = useRef<number>(0);
  
  canvasRenderCount.current++;
  const now = Date.now();
  if (now - lastCanvasRenderLog.current > 1000) {
    console.log(`🟢 Canvas component rendered ${canvasRenderCount.current} times in last second`);
    canvasRenderCount.current = 0;
    lastCanvasRenderLog.current = now;
  }
  
  const {
    presentation,
    currentSlideId,
    selectedShapeIds,
    updateShape,
    selectShape,
    clearSelection,
    zoom,
    pan,
    setZoom,
    setPan,
    saveHistory,
    tool,
    selectionRect,
    setSelectionRect,
    selectShapesInRect,
    refreshUI,
    setGroupTransformer,
    setTool,
    editingTextId,
    setEditingTextId,
  } = useEditorStore();

  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingHtml, setEditingHtml] = useState('');
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  const lastSelectionUpdate = useRef<number>(0);
  const lastRefreshUI = useRef<number>(0);
  const lastGroupTransformUpdate = useRef<number>(0);
  const pendingSelectionRect = useRef<any>(null);

  const grabCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='7' fill='white' stroke='black' stroke-width='2'/><circle cx='16' cy='16' r='2' fill='black'/></svg>") 16 16, grab`;
  const grabbingCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='7' fill='black' stroke='white' stroke-width='2'/><circle cx='16' cy='16' r='2' fill='white'/></svg>") 16 16, grabbing`;

  const currentSlide = presentation?.getSlide(currentSlideId || '');

  const startTextEditing = useCallback((shapeId: string) => {
    if (!currentSlide) return;
    const shape = currentSlide.getShape(shapeId);
    if (!shape || shape.type !== ShapeType.TEXT) return;
    const textShape = shape as any;

    saveHistory();
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      // ignore
    }
    selectShape(shapeId);
    setTool(ToolType.SELECT);
    setEditingTextId(shapeId);
    setEditingHtml(textShape.text || '');
  }, [currentSlide, saveHistory, selectShape, setTool]);

  const stopTextEditing = useCallback((save = true) => {
    if (!editingTextId) return;
    if (save && editingTextId) {
      updateShape(editingTextId, { text: editingHtml }, { saveHistory: false });
    }
    setEditingTextId(null);
  }, [editingTextId, editingHtml, updateShape]);

  useEffect(() => {
    if (!editingTextId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopTextEditing(true);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!textEditorRef.current) return;
      const target = event.target as Node;
      
      // Don't close if clicking inside the text editor
      if (textEditorRef.current.contains(target)) return;
      
      // Don't close if clicking on the toolbar or its children
      const toolbar = document.querySelector('.toolbar');
      if (toolbar?.contains(target)) return;
      
      // Close editor if clicking anywhere else
      stopTextEditing(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [editingTextId, stopTextEditing]);

  useEffect(() => {
    if (!editingTextId || !currentSlide) return;
    const shape = currentSlide.getShape(editingTextId);
    if (!shape) {
      setEditingTextId(null);
    }
  }, [editingTextId, currentSlide]);

  useEffect(() => {
    if (!editingTextId || !textEditorRef.current) return;
    textEditorRef.current.innerHTML = editingHtml || '';
    textEditorRef.current.focus();
  }, [editingTextId]);

  // Clear selection state when tool changes to avoid conflicts
  useEffect(() => {
    if (tool !== 'select') {
      setIsSelecting(false);
      setSelectionRect(null);
    }
  }, [tool]);

  // Group transformer for multi-selection
  useEffect(() => {
    if (selectedShapeIds.length > 1 && tool === ToolType.SELECT && selectionGroupRef.current) {
      const layer = selectionGroupRef.current.getLayer();
      if (!layer) return;

      // Get all selected shape nodes
      const selectedNodes = currentSlide?.shapes
        .filter(shape => selectedShapeIds.includes(shape.id))
        .map(shape => {
          // Find the Konva node for this shape
          return layer.findOne(`#shape-${shape.id}`);
        })
        .filter(Boolean);

      if (selectedNodes && selectedNodes.length > 1) {
        // Create transformer for the group
        const transformer = new Konva.Transformer({
          nodes: selectedNodes,
          keepRatio: false,
          enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'middle-left', 'middle-right', 'bottom-center'],
          borderStrokeWidth: 1,
          anchorStrokeWidth: 1,
          anchorSize: 8,
          centeredScaling: false,
          rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
        });

        transformer.ignoreStroke(true);
        transformerRef.current = transformer;
        setGroupTransformer(transformer);
        layer.add(transformer);
        
        // Listen for transform start
        transformer.on('transformstart', () => {
          console.log('🟢 Group transform started with shapes:', selectedShapeIds);
        });

        const updateShapesFromNodes = (isLive: boolean) => {
          selectedNodes.forEach((node: any) => {
            const shapeId = node.id().replace('shape-', '');
            const shape = currentSlide?.shapes.find(s => s.id === shapeId);
            if (!shape) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const rotation = node.rotation();
            const width = shape.transform.size.width;
            const height = shape.transform.size.height;

            const isScaled = Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001;
            const liveWidth = isScaled ? node.width() * scaleX : width;
            const liveHeight = isScaled ? node.height() * scaleY : height;

            let newPosition;
            if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
              newPosition = {
                x: node.x(),
                y: node.y(),
              };
            } else {
              newPosition = {
                x: node.x() - liveWidth / 2,
                y: node.y() - liveHeight / 2,
              };
            }

            const updatePayload: any = {
              transform: {
                ...shape.transform,
                position: newPosition,
                rotation: rotation,
                size: { width: liveWidth, height: liveHeight },
              },
            };

            updateShape(shapeId, updatePayload, { saveHistory: false });
          });

          const now = Date.now();
          if (!isLive || now - lastGroupTransformUpdate.current > 16) {
            refreshUI();
            lastGroupTransformUpdate.current = now;
          }
        };

        transformer.on('transform', () => {
          updateShapesFromNodes(true);
        });
        
        // Listen for transform end to update all shapes
        transformer.on('transformend', () => {
          console.log('🔄 Group transform ended');
          selectedNodes.forEach((node: any) => {
            const shapeId = node.id().replace('shape-', '');
            const shape = currentSlide?.shapes.find(s => s.id === shapeId);
            if (!shape) return;

            console.log(`📦 Shape ${shapeId} (${shape.type}):`, {
              nodeX: node.x(),
              nodeY: node.y(),
              nodeRotation: node.rotation(),
              nodeScaleX: node.scaleX(),
              nodeScaleY: node.scaleY(),
              originalRotation: shape.transform.rotation,
            });

            // Get the transform values from the node
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const rotation = node.rotation();
            
            // Calculate new size based on scale
            const newWidth = node.width() * scaleX;
            const newHeight = node.height() * scaleY;
            
            // After group transform, node.x() and node.y() are already in the correct final positions
            // For center-based shapes, they represent the center position
            // We need to store as top-left for our data model
            let newPosition;
            if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
              // Lines are already top-left based
              newPosition = {
                x: node.x(),
                y: node.y(),
              };
            } else {
              // For center-based shapes, convert center position to top-left
              // node.x/y is the rotated center position, so just subtract half width/height
              newPosition = {
                x: node.x() - newWidth / 2,
                y: node.y() - newHeight / 2,
              };
            }
            
            console.log(`✅ Calculated new position for ${shapeId}:`, newPosition, `rotation: ${rotation}`);
            
            // Reset scale to 1
            node.scaleX(1);
            node.scaleY(1);
            
            // Update node dimensions
            let newPoints: number[] | undefined;
            if (shape.type === ShapeType.CIRCLE) {
              node.radiusX(newWidth / 2);
              node.radiusY(newHeight / 2);
            } else if (shape.type === ShapeType.TRIANGLE) {
              newPoints = [0, newHeight, newWidth / 2, 0, newWidth, newHeight];
              node.points(newPoints);
            } else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
              const oldPoints = (shape as any).points || [0, 0, 100, 100];
              newPoints = oldPoints.map((coord: number, index: number) => 
                index % 2 === 0 ? coord * scaleX : coord * scaleY
              );
              node.points(newPoints);
            } else {
              node.width(newWidth);
              node.height(newHeight);
            }
            
            // Build update payload
            const updatePayload: any = {
              transform: {
                ...shape.transform,
                position: newPosition,
                size: { width: newWidth, height: newHeight },
                // Apply the rotation from the node
                rotation: rotation,
              },
            };
            
            if (newPoints !== undefined) {
              updatePayload.points = newPoints;
            }
            
            // Update the shape in the store
            updateShape(shapeId, updatePayload, { saveHistory: false });
          });
          
          // Refresh UI after all updates
          refreshUI();
        });
        
        return () => {
          transformer.destroy();
          transformerRef.current = null;
          setGroupTransformer(null);
        };
      }
    }
  }, [selectedShapeIds, tool, currentSlide?.shapes, updateShape, refreshUI]);

  const handleStageMouseDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();

    if (tool === 'pan') {
      // Pan should work even when clicking on shapes
      setIsPanning(true);
      const pos = e.target.getStage().getPointerPosition();
      lastPanPosition.current = pos;
      // Don't manually set cursor here - let the useEffect handle it since isPanning is changing
    } else if (tool === 'select' && clickedOnEmpty) {
      const stage = e.target.getStage();
      const screenPos = stage.getPointerPosition();
      
      clearSelection();
      setIsSelecting(true);
      setSelectionRect({ start: screenPos, end: screenPos });
    }
  };

  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (isPanning && lastPanPosition.current) {
      const dx = pos.x - lastPanPosition.current.x;
      const dy = pos.y - lastPanPosition.current.y;
      
      setPan({
        x: pan.x + dx,
        y: pan.y + dy,
      });
      
      lastPanPosition.current = pos;
    } else if (isSelecting && selectionRect) {
      // Store the pending update
      pendingSelectionRect.current = {
        start: selectionRect.start,
        end: pos,
      };
      
      const now = Date.now();
      // Only actually update state every 16ms (~60fps)
      if (now - lastSelectionUpdate.current >= 16) {
        setSelectionRect(pendingSelectionRect.current);
        lastSelectionUpdate.current = now;
      }
    }
  };

  const handleStageMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPosition.current = null;
      // Don't manually set cursor here - let the useEffect handle it since isPanning is changing
    } else if (isSelecting && (selectionRect || pendingSelectionRect.current)) {
      // Use the pending rect if it's more recent than the state
      const finalRect = pendingSelectionRect.current || selectionRect;
      
      // Only select if there's a meaningful selection area
      const width = Math.abs(finalRect.end.x - finalRect.start.x);
      const height = Math.abs(finalRect.end.y - finalRect.start.y);
      
      if (width > 5 && height > 5) {
        selectShapesInRect(finalRect);
      }
      
      setIsSelecting(false);
      setSelectionRect(null);
      pendingSelectionRect.current = null;
    }
  };

  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty && tool !== 'pan' && tool !== 'select') {
      clearSelection();
    }
  };

  // Update cursor based on tool
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const container = stage.container();
    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    const body = document.body;
    
    if (tool === 'pan') {
      const cursor = isPanning ? grabbingCursor : grabCursor;
      
      // Set cursor with !important to prevent override
      container.style.setProperty('cursor', cursor, 'important');
      if (canvas) {
        canvas.style.setProperty('cursor', cursor, 'important');
      }
      body.style.setProperty('cursor', cursor, 'important');
    } else if (tool === 'select') {
      // Set cursor with !important to prevent override
      container.style.setProperty('cursor', 'default', 'important');
      if (canvas) {
        canvas.style.setProperty('cursor', 'default', 'important');
      }
      body.style.setProperty('cursor', 'default', 'important');
    }
    
    return () => {
      // cleanup
    };
  }, [tool, isPanning]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    setZoom(newScale);
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setPan(newPos);
  };

  const handleShapeChange = useCallback((shapeId: string, updates: any) => {
    // If this shape is selected and there are multiple selections, move all selected shapes
    if (selectedShapeIds.includes(shapeId) && selectedShapeIds.length > 1 && updates.transform?.position) {
      const shape = currentSlide?.shapes.find(s => s.id === shapeId);
      if (!shape) return;
      
      // Calculate the delta (movement distance)
      const delta = {
        x: updates.transform.position.x - shape.transform.position.x,
        y: updates.transform.position.y - shape.transform.position.y,
      };
      
      // Apply the delta to ALL selected shapes (including the dragged one)
      // This ensures they all move together in perfect sync
      selectedShapeIds.forEach((selectedId) => {
        const selectedShape = currentSlide?.shapes.find(s => s.id === selectedId);
        if (selectedShape) {
          updateShape(selectedId, {
            transform: {
              ...selectedShape.transform,
              position: {
                x: selectedShape.transform.position.x + delta.x,
                y: selectedShape.transform.position.y + delta.y,
              },
            },
          });
        }
      });
    } else {
      // Single shape update
      updateShape(shapeId, updates);
    }
    
    // Throttle refreshUI to 30fps
    const now = Date.now();
    if (now - lastRefreshUI.current > 33) {
      refreshUI();
      lastRefreshUI.current = now;
    }
  }, [selectedShapeIds, currentSlide, updateShape, refreshUI]);

  const editingShape = editingTextId && currentSlide
    ? currentSlide.getShape(editingTextId)
    : null;

  const handleEditorInput = useCallback(() => {
    if (!editingTextId || !textEditorRef.current) return;
    const html = textEditorRef.current.innerHTML;
    setEditingHtml(html);
    updateShape(editingTextId, { text: html });
  }, [editingTextId, updateShape]);

  const applyCommand = useCallback((command: string, value?: string) => {
    if (!textEditorRef.current) return;
    textEditorRef.current.focus();
    document.execCommand(command, false, value);
    requestAnimationFrame(() => handleEditorInput());
  }, [handleEditorInput]);

  // Expose applyCommand to window for Toolbar to use
  useEffect(() => {
    (window as any).canvasApplyCommand = applyCommand;
    return () => {
      delete (window as any).canvasApplyCommand;
    };
  }, [applyCommand]);

  if (!currentSlide) {
    return (
      <div className="canvas-container">
        <div className="canvas-empty">No slide selected</div>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onWheel={handleWheel}
        style={{ background: currentSlide.background }}
      >
        <Layer>
          <Group ref={selectionGroupRef}>
            {currentSlide.shapes.map((shape) => (
              <MemoizedCanvasShape
                key={shape.id}
                shape={shape}
                isSelected={selectedShapeIds.includes(shape.id)}
                isMultiSelected={selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id)}
                isEditing={editingTextId === shape.id}
                onSelect={() => selectShape(shape.id)}
                onChange={(updates) => handleShapeChange(shape.id, updates)}
                onStart={() => saveHistory()}
                onEditText={startTextEditing}
              />
            ))}
          </Group>
          {/* Selection rectangle */}
          {selectionRect && (() => {
            // Convert screen coordinates to canvas coordinates for proper display
            const startX = (selectionRect.start.x - pan.x) / zoom;
            const startY = (selectionRect.start.y - pan.y) / zoom;
            const endX = (selectionRect.end.x - pan.x) / zoom;
            const endY = (selectionRect.end.y - pan.y) / zoom;
            
            return (
              <Rect
                x={Math.min(startX, endX)}
                y={Math.min(startY, endY)}
                width={Math.abs(endX - startX)}
                height={Math.abs(endY - startY)}
                fill="rgba(0, 123, 255, 0.1)"
                stroke="rgba(0, 123, 255, 0.8)"
                strokeWidth={1 / zoom}
                listening={false}
              />
            );
          })()}
        </Layer>
      </Stage>

      <div
        className="canvas-text-display-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {currentSlide.shapes
          .filter((shape) => shape.type === ShapeType.TEXT)
          .map((shape) => {
            if (shape.id === editingTextId) return null;
            const textShape = shape as any;
            return (
              <div
                key={shape.id}
                className="canvas-text-display"
                style={{
                  left: `${textShape.transform.position.x}px`,
                  top: `${textShape.transform.position.y}px`,
                  width: `${textShape.transform.size.width}px`,
                  height: `${textShape.transform.size.height}px`,
                  transform: `rotate(${textShape.transform.rotation}deg)`,
                  transformOrigin: 'center center',
                  opacity: textShape.opacity,
                  color: textShape.color?.fill || '#111827',
                  fontSize: `${textShape.fontSize || 24}px`,
                  fontFamily: textShape.fontFamily || 'Arial',
                }}
                dangerouslySetInnerHTML={{ __html: textShape.text || '' }}
              />
            );
          })}
      </div>

      {editingShape && editingShape.type === ShapeType.TEXT && (
        <div
          className="canvas-text-editor-layer"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {(() => {
            const textShape = editingShape as any;
            return (
          <div
            className="canvas-text-editor"
            style={{
              left: `${textShape.transform.position.x}px`,
              top: `${textShape.transform.position.y}px`,
              width: `${textShape.transform.size.width}px`,
              height: `${textShape.transform.size.height}px`,
              transform: `rotate(${textShape.transform.rotation}deg)`,
              transformOrigin: 'center center',
              color: textShape.color?.fill || '#111827',
              ['--editor-font-size' as any]: `${textShape.fontSize || 24}px`,
              ['--editor-font-family' as any]: textShape.fontFamily || 'Arial',
            }}
          >
            <div
              ref={textEditorRef}
              className="rich-text-editor"
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
            />
          </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
