import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text } from 'react-konva';
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
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      });
      shapeRef.current.getLayer().add(transformer);
      return () => {
        transformer.destroy();
      };
    }
  }, [isSelected]);

  const handleDragEnd = (e: any) => {
    onChange({
      transform: {
        ...shape.transform,
        position: { x: e.target.x(), y: e.target.y() },
      },
    });
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      transform: {
        ...shape.transform,
        position: { x: node.x(), y: node.y() },
        size: {
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
        },
        rotation: node.rotation(),
      },
    });
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
      return (
        <Circle
          {...commonProps}
          radius={Math.min(shape.transform.size.width, shape.transform.size.height) / 2}
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
