import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Ellipse, Line, Text } from 'react-konva';
import { useEditorStore } from '../../stores/editorStore';
import { ShapeType } from '../../types';
import Konva from 'konva';

interface CanvasShapeProps {
  shape: any;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: any) => void;
}

const CanvasShape: React.FC<CanvasShapeProps> = ({ shape, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && shapeRef.current) {
      const transformer = new Konva.Transformer({
        nodes: [shapeRef.current],
        keepRatio: false,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'middle-left', 'middle-right', 'bottom-center'],
        // Enable shift key to toggle aspect ratio locking
        // When shift is pressed, keepRatio becomes true
        centeredScaling: false,
      });
      
      // Listen for transform events to check shift key state
      transformer.on('transformstart', () => {
        console.log('🔵 Transform started');
      });
      
      transformer.on('transform', () => {
        const stage = shapeRef.current.getStage();
        if (stage) {
          const isShiftPressed = stage.container().ownerDocument.shiftKey || 
                                window.event?.shiftKey || false;
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
  }, [isSelected]);

  const handleDragEnd = (e: any) => {
    // CRITICAL: For circles, node.x/y is at CENTER, but we store position as TOP-LEFT
    // So we need to convert center position back to top-left corner
    let newPosition = { x: e.target.x(), y: e.target.y() };
    if (shape.type === ShapeType.CIRCLE) {
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
    
    onChange({
      transform: {
        ...shape.transform,
        position: newPosition,
      },
    });
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
    
    // CRITICAL: For circles, node.x/y is at CENTER, but we store position as TOP-LEFT
    // So we need to convert center position back to top-left corner
    let newPosition = { x: node.x(), y: node.y() };
    if (shape.type === ShapeType.CIRCLE) {
      newPosition = {
        x: node.x() - newWidth / 2,
        y: node.y() - newHeight / 2,
      };
    }
    
    const newRotation = node.rotation();

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
    if (shape.type === ShapeType.CIRCLE) {
      // Ellipse uses radiusX and radiusY, allowing non-uniform sizing
      node.radiusX(newWidth / 2);
      node.radiusY(newHeight / 2);
      console.log('⚠️ CRITICAL FIX: Ellipse radii updated to:', newWidth / 2, 'x', newHeight / 2);
    } else if (shape.type === ShapeType.TRIANGLE) {
      // Triangle is a Line shape - update its points array to match new dimensions
      const newPoints = [
        0, newHeight,
        newWidth / 2, 0,
        newWidth, newHeight,
      ];
      node.points(newPoints);
      console.log('⚠️ CRITICAL FIX: Triangle points updated to:', newPoints);
    } else {
      // Rectangles, etc. use width/height
      node.width(newWidth);
      node.height(newHeight);
      console.log('⚠️ CRITICAL FIX: Node dimensions updated to:', newWidth, 'x', newHeight);
    }
    console.log('Verification - radiusX/width:', node.radiusX?.() || node.width(), 'radiusY/height:', node.radiusY?.() || node.height());

    const updatePayload = {
      transform: {
        ...shape.transform,
        position: newPosition,
        size: newSize,
        rotation: newRotation,
      },
    };
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
    fill: shape.color.fill,
    stroke: shape.color.stroke,
    strokeWidth: shape.color.strokeWidth,
    strokeScaleEnabled: false, // Keep stroke width constant during transforms
    opacity: shape.opacity,
    draggable: !shape.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
  };

  switch (shape.type) {
    case ShapeType.RECTANGLE:
      return <Rect {...commonProps} />;
    
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
          text={shape.text || 'Text'}
          fontSize={shape.fontSize || 24}
          fontFamily={shape.fontFamily || 'Arial'}
        />
      );
    
    case ShapeType.LINE:
    case ShapeType.ARROW:
      return (
        <Line
          {...commonProps}
          points={shape.points || [0, 0, 100, 100]}
          pointerLength={shape.type === ShapeType.ARROW ? 10 : 0}
          pointerWidth={shape.type === ShapeType.ARROW ? 10 : 0}
        />
      );
    
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
  } = useEditorStore();

  const currentSlide = presentation?.getSlide(currentSlideId || '');

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
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
