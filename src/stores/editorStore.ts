import { create } from 'zustand';
import { Presentation, Shape } from '../models';
import { ToolType, ShapeType } from '../types';
import type { Position, ShapeData, Size } from '../types';
import { PresentationService } from '../services';
import { ShapeFactory } from '../services';

interface EditorState {
  // Presentation state
  presentation: Presentation | null;
  currentSlideId: string | null;
  version: number; // Increment to force re-renders
  
  // Canvas state
  selectedShapeIds: string[];
  copiedShapes: ShapeData[];
  tool: ToolType;
  zoom: number;
  pan: Position;
  
  // History
  history: {
    past: ShapeData[][];
    future: ShapeData[][];
  };
  
  // Actions - Presentation
  createPresentation: (name?: string) => void;
  loadPresentation: (presentation: Presentation) => void;
  savePresentation: () => void;
  setPresentationName: (name: string) => void;
  
  // Actions - Slides
  addSlide: () => void;
  removeSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => void;
  setCurrentSlide: (slideId: string) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  
  // Actions - Shapes
  addShape: (type: ShapeType, position: Position, options?: { size?: Size; imageUrl?: string }) => void;
  removeShape: (shapeId: string) => void;
  updateShape: (shapeId: string, updates: Partial<ShapeData>) => void;
  selectShape: (shapeId: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  copyShapes: () => void;
  pasteShapes: () => void;
  deleteSelected: () => void;
  
  // Actions - Canvas
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Position) => void;
  resetView: () => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  presentation: null,
  currentSlideId: null,
  version: 0,
  selectedShapeIds: [],
  copiedShapes: [],
  tool: ToolType.SELECT,
  zoom: 1,
  pan: { x: 0, y: 0 },
  history: {
    past: [],
    future: [],
  },

  // Presentation actions
  createPresentation: (name) => {
    const service = PresentationService.getInstance();
    const presentation = service.createPresentation(name);
    set({
      presentation,
      currentSlideId: presentation.slides[0]?.id || null,
      selectedShapeIds: [],
      history: { past: [], future: [] },
    });
  },

  loadPresentation: (presentation) => {
    set({
      presentation,
      currentSlideId: presentation.slides[0]?.id || null,
      selectedShapeIds: [],
      history: { past: [], future: [] },
    });
  },

  savePresentation: () => {
    const { presentation } = get();
    if (!presentation) return;
    
    const service = PresentationService.getInstance();
    service.saveToDatabase(presentation);
  },

  setPresentationName: (name) => {
    const { presentation } = get();
    if (!presentation) return;
    
    presentation.setName(name);
    set({ presentation });
  },

  // Slide actions
  addSlide: () => {
    const { presentation } = get();
    if (!presentation) return;
    
    const newSlide = presentation.addSlide();
    set({ presentation, currentSlideId: newSlide.id });
  },

  removeSlide: (slideId) => {
    const { presentation, currentSlideId } = get();
    if (!presentation) return;
    
    presentation.removeSlide(slideId);
    
    // Update current slide if removed
    const newCurrentSlideId = currentSlideId === slideId
      ? presentation.slides[0]?.id || null
      : currentSlideId;
    
    set({ presentation, currentSlideId: newCurrentSlideId });
  },

  duplicateSlide: (slideId) => {
    const { presentation } = get();
    if (!presentation) return;
    
    const newSlide = presentation.duplicateSlide(slideId);
    if (newSlide) {
      set({ presentation, currentSlideId: newSlide.id });
    }
  },

  setCurrentSlide: (slideId) => {
    set({ currentSlideId: slideId, selectedShapeIds: [] });
  },

  moveSlide: (fromIndex, toIndex) => {
    const { presentation } = get();
    if (!presentation) return;
    
    presentation.moveSlide(fromIndex, toIndex);
    set({ presentation });
  },

  // Shape actions
  addShape: (type, position, options) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    const shape = ShapeFactory.createShape(type, position, options?.size);
    if (type === ShapeType.IMAGE && options?.imageUrl && 'setImageUrl' in shape) {
      (shape as any).setImageUrl(options.imageUrl);
    }
    slide.addShape(shape);
    get().saveHistory();
    
    set({ presentation, selectedShapeIds: [shape.id] });
  },

  removeShape: (shapeId) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    slide.removeShape(shapeId);
    get().saveHistory();
    
    set({
      presentation,
      selectedShapeIds: get().selectedShapeIds.filter(id => id !== shapeId),
    });
  },

  updateShape: (shapeId, updates) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    const shapeBeforeUpdate = slide.shapes.find(s => s.id === shapeId);
    
    console.group('🟢 STORE UPDATE - updateShape');
    console.log('Shape ID:', shapeId);
    console.log('Current Slide ID:', currentSlideId);
    console.log('Updates Received:', updates);
    if (shapeBeforeUpdate) {
      console.log('Shape Before Update:');
      console.table({
        'Type': shapeBeforeUpdate.type,
        'Position': shapeBeforeUpdate.transform.position,
        'Size': shapeBeforeUpdate.transform.size,
        'Rotation': shapeBeforeUpdate.transform.rotation,
        'Locked': shapeBeforeUpdate.locked,
      });
    }
    
    slide.updateShape(shapeId, updates);
    
    const shapeAfterUpdate = slide.shapes.find(s => s.id === shapeId);
    if (shapeAfterUpdate) {
      console.log('Shape After Update:');
      console.table({
        'Type': shapeAfterUpdate.type,
        'Position': shapeAfterUpdate.transform.position,
        'Size': shapeAfterUpdate.transform.size,
        'Rotation': shapeAfterUpdate.transform.rotation,
        'Locked': shapeAfterUpdate.locked,
      });
    }
    console.groupEnd();
    
    // Increment version to trigger re-render
    set({ version: get().version + 1 });
  },

  selectShape: (shapeId, addToSelection = false) => {
    const { selectedShapeIds } = get();
    
    if (addToSelection) {
      if (selectedShapeIds.includes(shapeId)) {
        set({ selectedShapeIds: selectedShapeIds.filter(id => id !== shapeId) });
      } else {
        set({ selectedShapeIds: [...selectedShapeIds, shapeId] });
      }
    } else {
      set({ selectedShapeIds: [shapeId] });
    }
  },

  clearSelection: () => {
    set({ selectedShapeIds: [] });
  },

  copyShapes: () => {
    const { presentation, currentSlideId, selectedShapeIds } = get();
    if (!presentation || !currentSlideId) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    const shapesToCopy = selectedShapeIds
      .map(id => slide.getShape(id))
      .filter((shape): shape is Shape => shape !== undefined)
      .map(shape => shape.toData());
    
    set({ copiedShapes: shapesToCopy });
  },

  pasteShapes: () => {
    const { presentation, currentSlideId, copiedShapes } = get();
    if (!presentation || !currentSlideId || copiedShapes.length === 0) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    const newShapeIds: string[] = [];
    
    copiedShapes.forEach(shapeData => {
      const shape = ShapeFactory.fromData(shapeData);
      // Offset pasted shapes
      shape.setPosition({
        x: shape.transform.position.x + 20,
        y: shape.transform.position.y + 20,
      });
      slide.addShape(shape);
      newShapeIds.push(shape.id);
    });
    
    get().saveHistory();
    set({ presentation, selectedShapeIds: newShapeIds });
  },

  deleteSelected: () => {
    const { selectedShapeIds } = get();
    selectedShapeIds.forEach(id => get().removeShape(id));
  },

  // Canvas actions
  setTool: (tool) => {
    set({ tool });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },

  setPan: (pan) => {
    set({ pan });
  },

  resetView: () => {
    set({ zoom: 1, pan: { x: 0, y: 0 } });
  },

  // History actions
  saveHistory: () => {
    const { presentation, currentSlideId, history } = get();
    if (!presentation || !currentSlideId) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    const currentState = slide.shapes.map(shape => shape.toData());
    
    set({
      history: {
        past: [...history.past, currentState],
        future: [],
      },
    });
  },

  undo: () => {
    const { presentation, currentSlideId, history } = get();
    if (!presentation || !currentSlideId || history.past.length === 0) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    const currentState = slide.shapes.map(shape => shape.toData());
    const previousState = history.past[history.past.length - 1];
    
    // Restore previous state
    slide.shapes = previousState.map(shapeData => ShapeFactory.fromData(shapeData));
    
    set({
      presentation,
      history: {
        past: history.past.slice(0, -1),
        future: [currentState, ...history.future],
      },
    });
  },

  redo: () => {
    const { presentation, currentSlideId, history } = get();
    if (!presentation || !currentSlideId || history.future.length === 0) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    const currentState = slide.shapes.map(shape => shape.toData());
    const nextState = history.future[0];
    
    // Restore next state
    slide.shapes = nextState.map(shapeData => ShapeFactory.fromData(shapeData));
    
    set({
      presentation,
      history: {
        past: [...history.past, currentState],
        future: history.future.slice(1),
      },
    });
  },
}));
