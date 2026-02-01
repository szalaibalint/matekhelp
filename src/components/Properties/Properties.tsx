import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ShapeType } from '../../types';

export const Properties: React.FC = () => {
  const { presentation, currentSlideId, selectedShapeIds, updateShape, refreshUI, groupTransformer } = useEditorStore();

  const currentSlide = presentation?.getSlide(currentSlideId || '');
  const selectedShape = selectedShapeIds.length === 1
    ? currentSlide?.getShape(selectedShapeIds[0])
    : null;
  
  const isMultiSelection = selectedShapeIds.length > 1;
  
  // Track initial group state for relative rotation calculations
  const [initialGroupState, setInitialGroupState] = useState<{
    rotation: number;
    centerX: number;
    centerY: number;
    shapes: Array<{
      id: string;
      centerX: number;
      centerY: number;
      rotation: number;
    }>;
  } | null>(null);

  const buildGroupState = (shapes: any[]) => {
    if (!shapes || shapes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(shape => {
      const x = shape.transform.position.x;
      const y = shape.transform.position.y;
      const w = shape.transform.size.width;
      const h = shape.transform.size.height;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const rotation = shapes[0].transform.rotation;

    return {
      rotation,
      centerX,
      centerY,
      shapes: shapes.map(shape => ({
        id: shape.id,
        centerX: shape.transform.position.x + shape.transform.size.width / 2,
        centerY: shape.transform.position.y + shape.transform.size.height / 2,
        rotation: shape.transform.rotation,
      })),
    };
  };
  
  // Calculate current group rotation from actual shape rotations (updates in real-time)
  const currentGroupRotation = (() => {
    if (isMultiSelection && currentSlide) {
      const selectedShapes = currentSlide.shapes.filter(s => selectedShapeIds.includes(s.id));
      if (selectedShapes.length > 0) {
        let rotation = selectedShapes[0].transform.rotation;
        // Normalize to 0-360 range
        rotation = rotation % 360;
        if (rotation < 0) rotation += 360;
        return rotation;
      }
    }
    return 0;
  })();
  
  // Update initial state when selection changes or when user starts dragging slider
  useEffect(() => {
    if (isMultiSelection && currentSlide) {
      const selectedShapes = currentSlide.shapes.filter(s => selectedShapeIds.includes(s.id));
      const groupState = buildGroupState(selectedShapes);
      if (groupState) {
        setInitialGroupState(groupState);
      }
    }
  }, [selectedShapeIds, isMultiSelection, currentSlide]);

  if (selectedShapeIds.length === 0) {
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

  // For multi-selection, show only rotation control
  if (isMultiSelection) {
    const handleGroupRotationChange = (value: number) => {
      console.log('\n🎯 SLIDER: Attempting to rotate to:', value);
      
      if (!groupTransformer || !currentSlide) {
        console.log('❌ SLIDER: Missing groupTransformer or currentSlide');
        return;
      }
      
      const nodes = groupTransformer.nodes();
      if (!nodes || nodes.length === 0) {
        console.log('❌ SLIDER: No nodes in transformer');
        return;
      }
      
      const selectedShapes = currentSlide.shapes.filter(s => selectedShapeIds.includes(s.id));
      const groupState = initialGroupState ?? buildGroupState(selectedShapes);
      if (!groupState) {
        console.log('❌ SLIDER: Missing group state');
        return;
      }

      if (!initialGroupState) {
        setInitialGroupState(groupState);
      }

      const currentRot = groupState.rotation;
      const delta = value - currentRot;
      
      console.log(`🔄 SLIDER: Current=${currentRot}°, Target=${value}°, Delta=${delta}°`);
      
      // Log node visual properties BEFORE rotation
      console.log('📊 BEFORE rotation:');
      nodes.forEach((node: any, index: number) => {
        console.log(`  Node ${index}:`, {
          rotation: node.rotation(),
          visible: node.visible(),
          opacity: node.opacity(),
          x: node.x(),
          y: node.y()
        });
      });
      
      // Use stable group center based on shape data (avoids bounding-box drift)
      const centerX = groupState.centerX;
      const centerY = groupState.centerY;
      
      console.log(`🔄 GROUP CENTER: x=${centerX}, y=${centerY}`);
      
      // Rotate each node around the group center (not around its own center)
      nodes.forEach((node: any, index: number) => {
        const shapeId = node.attrs?.shapeId || node.id()?.replace('shape-', '');
        const shapeState = groupState.shapes.find(s => s.id === shapeId);
        const shape = currentSlide.shapes.find(s => s.id === shapeId);
        if (!shapeState || !shape) return;

        const nodeX = node.x();
        const nodeY = node.y();

        // Rotate shape's center around group center
        const angle = (delta * Math.PI) / 180;
        const dx = shapeState.centerX - centerX;
        const dy = shapeState.centerY - centerY;

        const newDx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const newDy = dx * Math.sin(angle) + dy * Math.cos(angle);

        const newCenterX = centerX + newDx;
        const newCenterY = centerY + newDy;

        const newRotation = shapeState.rotation + delta;

        if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
          node.x(newCenterX - shape.transform.size.width / 2);
          node.y(newCenterY - shape.transform.size.height / 2);
        } else {
          node.x(newCenterX);
          node.y(newCenterY);
        }
        node.rotation(newRotation);

        console.log(`  Node ${index}: pos (${nodeX},${nodeY})→(${node.x()},${node.y()}), rot ${shapeState.rotation}°→${node.rotation()}°`);
      });
      
      // Get layer and stage
      const layer = groupTransformer.getLayer();
      const stage = layer?.getStage();
      const canvas = layer?.getCanvas?.();
      
      console.log('🔧 INFRASTRUCTURE:', {
        layer: !!layer,
        stage: !!stage,
        canvas: !!canvas,
        layerOpacity: layer?.opacity?.(),
        layerVisible: layer?.visible?.(),
        stageOpacity: stage?.opacity?.(),
        stageVisible: stage?.visible?.()
      });
      
      // Log node visual properties AFTER rotation change
      console.log('📊 AFTER setting rotation (before draw):');
      nodes.forEach((node: any, index: number) => {
        console.log(`  Node ${index}: rotation=${node.rotation()}°, visible=${node.visible()}`);
      });
      
      // Try stage.render() for complete canvas redraw
      console.log('🔧 CALLING RENDER METHODS...');
      groupTransformer.update?.();
      console.log('  ✓ transformer.update()');
      
      // Use stage.render() instead of draw to force actual shape re-rendering
      stage?.render?.();
      console.log('  ✓ stage.render()');
      
      // Log node visual properties AFTER draw
      console.log('📊 AFTER draw() calls:');
      nodes.forEach((node: any, index: number) => {
        console.log(`  Node ${index}: rotation=${node.rotation()}°`);
      });
      
      // Update store to trigger React re-render (might sync visual state)
      console.log('🔄 UPDATING STORE...');
      nodes.forEach((node: any) => {
        const shapeId = node.attrs?.shapeId || node.id()?.replace('shape-', '');
        const shape = currentSlide.shapes.find(s => s.id === shapeId);
        if (!shapeId || !shape) return;

        const normalizedRotation = ((node.rotation() % 360) + 360) % 360;
        const width = shape.transform.size.width;
        const height = shape.transform.size.height;
        const centerX = shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW
          ? node.x() + width / 2
          : node.x();
        const centerY = shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW
          ? node.y() + height / 2
          : node.y();

        console.log(`  → Shape ${shapeId}: rotation=${normalizedRotation}`);
        updateShape(shapeId, {
          transform: {
            ...shape.transform,
            rotation: normalizedRotation,
            position: {
              x: centerX - width / 2,
              y: centerY - height / 2,
            },
          },
        });
      });
      
      console.log('✅ SLIDER: Complete');
    };
    
    const handleSliderMouseUp = () => {
      // When slider is released, trigger transformend to save the changes
      if (!groupTransformer || !currentSlide) return;
      
      const nodes = groupTransformer.nodes();
      if (!nodes || nodes.length === 0) return;
      
      // Process each node and save its state
      nodes.forEach((node: any) => {
        const shapeId = node.id().replace('shape-', '');
        const shape = currentSlide.shapes.find(s => s.id === shapeId);
        if (!shape) return;
        
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();
        
        const newWidth = node.width() * scaleX;
        const newHeight = node.height() * scaleY;
        
        let newPosition;
        if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
          newPosition = {
            x: node.x(),
            y: node.y(),
          };
        } else {
          newPosition = {
            x: node.x() - newWidth / 2,
            y: node.y() - newHeight / 2,
          };
        }
        
        node.scaleX(1);
        node.scaleY(1);
        
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
        
        const updatePayload: any = {
          transform: {
            ...shape.transform,
            position: newPosition,
            size: { width: newWidth, height: newHeight },
            rotation: rotation,
          },
        };
        
        if (newPoints !== undefined) {
          updatePayload.points = newPoints;
        }
        
        updateShape(shape.id, updatePayload, { saveHistory: false });
      });
      
      const selectedShapes = currentSlide.shapes.filter(s => selectedShapeIds.includes(s.id));
      const groupState = buildGroupState(selectedShapes);
      if (groupState) {
        setInitialGroupState(groupState);
      }

      refreshUI();
    };
    
    return (
      <div className="properties">
        <div className="properties-header">
          <h3>Group Properties</h3>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
            {selectedShapeIds.length} shapes selected
          </p>
        </div>

        <div className="properties-content">
          {/* Rotation */}
          <div className="property-group">
            <label className="property-label">Group Rotation</label>
            <input
              type="range"
              min="0"
              max="360"
              value={currentGroupRotation}
              onChange={(e) => handleGroupRotationChange(parseFloat(e.target.value))}
              onMouseUp={handleSliderMouseUp}
              onTouchEnd={handleSliderMouseUp}
            />
            <span>{Math.round(currentGroupRotation)}°</span>
          </div>
        </div>
      </div>
    );
  }

  // Single selection - show all properties
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
    }, { saveHistory: true });
  };

  const handleStrokeWidthChange = (value: number) => {
    updateShape(selectedShape.id, {
      color: { ...selectedShape.color, strokeWidth: value },
    }, { saveHistory: true });
  };

  const handleOpacityChange = (value: number) => {
    updateShape(selectedShape.id, { opacity: value }, { saveHistory: true });
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
    }, { saveHistory: true });
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
    }, { saveHistory: true });
  };

  const handleRotationChange = (value: number) => {
    updateShape(selectedShape.id, {
      transform: {
        ...selectedShape.transform,
        rotation: value,
      },
    }, { saveHistory: true });
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
