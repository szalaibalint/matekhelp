import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Text, Group, Circle, Arrow, Image as KonvaImage } from 'react-konva';
import { useEditorStore } from '../../stores/editorStore';
import { ShapeType } from '../../types';
import Konva from 'konva';

interface CanvasShapeProps {
  shape: any;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: any) => void;
  onStart?: () => void;
}

const CanvasShape: React.FC<CanvasShapeProps> = ({ shape, isSelected, onSelect, onChange, onStart }) => {
  const shapeRef = useRef<any>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

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

  useEffect(() => {
    if (isSelected && shapeRef.current) {
      const transformer = new Konva.Transformer({
        nodes: [shapeRef.current],
        keepRatio: false,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'middle-left', 'middle-right', 'bottom-center'],
        borderStrokeWidth: 1,
        anchorStrokeWidth: 1,
        anchorSize: 8,
        // Enable shift key to toggle aspect ratio locking
        // When shift is pressed, keepRatio becomes true
        centeredScaling: false,
      });

      transformer.ignoreStroke(true);
      
      // Listen for transform events to check shift key state
      transformer.on('transformstart', () => {
        console.log('🔵 Transform started');
      });
      
      transformer.on('transform', () => {
        const stage = shapeRef.current.getStage();
        if (stage) {
          const isShiftPressed = stage.container().ownerDocument?.defaultView?.event?.shiftKey || false;
          transformer.keepRatio(isShiftPressed);
          
          if (isShiftPressed) {
            console.log('⚪ SHIFT pressed - proportional resize enabled');
          }
        }
      });
      
      shapeRef.current.getLayer().add(transformer);
      return () => {
        transformer.destroy();
      };
    }
  }, [isSelected, shape.id, shape.type, imageElement]);

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
    
    const oldPosition = shape.transform.position;
    const delta = {
      x: newPosition.x - oldPosition.x,
      y: newPosition.y - oldPosition.y,
    };
    console.group('🔴 SHAPE MOVE - dragEnd');
    console.log('Shape ID:', shape.id);
    console.log('Shape Type:', shape.type);
    console.log('Old Position:', oldPosition);
    console.log('New Position:', newPosition);
    console.log('Delta:', delta);
    console.log('Current Transform:', shape.transform);
    console.log('Update Payload:', { transform: { ...shape.transform, position: newPosition } });
    console.groupEnd();
    
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
    const oldSize = shape.transform.size;
    const oldRotation = shape.transform.rotation;
    const oldPosition = shape.transform.position;
    
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

    console.group('🔴 SHAPE RESIZE/TRANSFORM - transformEnd');
    console.log('Shape ID:', shape.id);
    console.log('Shape Type:', shape.type);
    console.log('Raw Node Values:');
    console.table({
      'node.x()': node.x(),
      'node.y()': node.y(),
      'node.width()': node.width(),
      'node.height()': node.height(),
      'node.scaleX()': scaleX,
      'node.scaleY()': scaleY,
      'node.rotation()': newRotation,
    });
    console.log('Old State:');
    console.table({
      'Position': oldPosition,
      'Size': oldSize,
      'Rotation': oldRotation,
    });
    console.log('New State:');
    console.table({
      'Position': newPosition,
      'Size': newSize,
      'Rotation': newRotation,
    });
    console.log('Calculated Values:');
    console.table({
      'newWidth (width * scaleX)': newWidth,
      'newHeight (height * scaleY)': newHeight,
      'Width Changed': oldSize.width !== newWidth,
      'Height Changed': oldSize.height !== newHeight,
      'Position Changed': oldPosition.x !== newPosition.x || oldPosition.y !== newPosition.y,
      'Rotation Changed': oldRotation !== newRotation,
    });

    node.scaleX(1);
    node.scaleY(1);
    console.log('Scale Reset: scaleX and scaleY set to 1');
    
    // CRITICAL FIX: Update node dimensions to match new size
    // This ensures the next transform uses the correct base dimensions
    // Different shape types have different properties
    let newPoints: number[] | undefined;
    
    if (shape.type === ShapeType.CIRCLE) {
      // Ellipse uses radiusX and radiusY, allowing non-uniform sizing
      node.radiusX(newWidth / 2);
      node.radiusY(newHeight / 2);
      console.log('⚠️ CRITICAL FIX: Ellipse radii updated to:', newWidth / 2, 'x', newHeight / 2);
    } else if (shape.type === ShapeType.TRIANGLE) {
      // Triangle is a Line shape - update its points array to match new dimensions
      newPoints = [
        0, newHeight,
        newWidth / 2, 0,
        newWidth, newHeight,
      ];
      node.points(newPoints);
      console.log('⚠️ CRITICAL FIX: Triangle points updated to:', newPoints);
    } else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
      // Lines and arrows use points array - scale existing points by scaleX and scaleY
      const oldPoints = shape.points || [0, 0, 100, 100];
      newPoints = oldPoints.map((coord: number, index: number) => 
        index % 2 === 0 ? coord * scaleX : coord * scaleY
      );
      node.points(newPoints);
      console.log('⚠️ CRITICAL FIX: Line/Arrow points scaled from:', oldPoints, 'to:', newPoints);
    } else {
      // Rectangles, etc. use width/height
      node.width(newWidth);
      node.height(newHeight);
      console.log('⚠️ CRITICAL FIX: Node dimensions updated to:', newWidth, 'x', newHeight);
    }
    console.log('Verification - radiusX/width:', node.radiusX?.() || node.width(), 'radiusY/height:', node.radiusY?.() || node.height());

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
    
    console.log('Final Update Payload:', updatePayload);
    console.groupEnd();
    
    onChange(updatePayload);
  };

  const commonProps = {
    ref: shapeRef,
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
    opacity: shape.opacity,
    draggable: !shape.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragStart: onStart,
    onDragMove: shape.type === ShapeType.IMAGE ? undefined : handleDragMove,
    onDragEnd: handleDragEnd,
    onTransformStart: onStart,
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
    
    case ShapeType.TEXT:
      return (
        <Text
          {...commonProps}
          x={shape.transform.position.x + shape.transform.size.width / 2}
          y={shape.transform.position.y + shape.transform.size.height / 2}
          offsetX={shape.transform.size.width / 2}
          offsetY={shape.transform.size.height / 2}
          text={shape.text || 'Text'}
          fontSize={shape.fontSize || 24}
          fontFamily={shape.fontFamily || 'Arial'}
        />
      );

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
          {isSelected && (
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

export const Canvas: React.FC = () => {
  const stageRef = useRef<any>(null);
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
    version,
    saveHistory,
  } = useEditorStore();

  const currentSlide = presentation?.getSlide(currentSlideId || '');

  console.group('🟢 CANVAS RENDER');
  console.log('Version:', version);
  console.log('Shapes count:', currentSlide?.shapes.length);
  if (currentSlide?.shapes.length) {
    console.log('First shape rotation:', currentSlide.shapes[0].transform.rotation);
  }
  console.groupEnd();

  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      clearSelection();
    }
  };

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
        onClick={handleStageClick}
        onWheel={handleWheel}
        style={{ background: currentSlide.background }}
      >
        <Layer>
          {currentSlide.shapes.map((shape) => (
            <CanvasShape
              key={shape.id}
              shape={shape}
              isSelected={selectedShapeIds.includes(shape.id)}
              onSelect={() => selectShape(shape.id)}
              onChange={(updates) => updateShape(shape.id, updates)}
              onStart={() => saveHistory()}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
