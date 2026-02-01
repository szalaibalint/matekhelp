import { create } from 'zustand';
import { Presentation } from '../models';
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
  selectionRect: { start: Position; end: Position } | null;
  groupTransformer: any | null;
  
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
  updateShape: (shapeId: string, updates: Partial<ShapeData>, options?: { saveHistory?: boolean }) => void;
  selectShape: (shapeId: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  duplicate: () => void;
  pasteShapes: () => void;
  deleteSelected: () => void;
  
  // Actions - Canvas
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Position) => void;
  resetView: () => void;
  setSelectionRect: (rect: { start: Position; end: Position } | null) => void;
  selectShapesInRect: (rect: { start: Position; end: Position }) => void;
  setGroupTransformer: (transformer: any) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  refreshUI: () => void;
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
  selectionRect: null,
  groupTransformer: null,
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
    set({ currentSlideId: slideId, selectedShapeIds: [], history: { past: [], future: [] } });
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
    
    get().saveHistory();
    
    const shape = ShapeFactory.createShape(type, position, options?.size);
    if (type === ShapeType.IMAGE && options?.imageUrl && 'setImageUrl' in shape) {
      (shape as any).setImageUrl(options.imageUrl);
    }
    slide.addShape(shape);
    
    set({ presentation, selectedShapeIds: [shape.id] });
  },

  removeShape: (shapeId) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    get().saveHistory();
    
    slide.removeShape(shapeId);
    
    set({
      presentation,
      selectedShapeIds: get().selectedShapeIds.filter(id => id !== shapeId),
    });
  },

  updateShape: (shapeId, updates, options) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    if (options?.saveHistory) {
      get().saveHistory();
    }
    
    const startTime = performance.now();
    slide.updateShape(shapeId, updates);
    const duration = performance.now() - startTime;
    
    if (duration > 5) {
      console.warn(`⚠️ updateShape took ${duration.toFixed(2)}ms for shape ${shapeId}`);
    }
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

  duplicate: () => {
    const { presentation, currentSlideId, selectedShapeIds } = get();
    if (!presentation || !currentSlideId || selectedShapeIds.length === 0) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    get().saveHistory();
    
    const newShapeIds: string[] = [];
    
    selectedShapeIds.forEach(id => {
      const shape = slide.getShape(id);
      if (!shape) return;
      
      // Clone the shape and offset it slightly
      const clonedShape = shape.clone();
      clonedShape.setPosition({
        x: clonedShape.transform.position.x + 20,
        y: clonedShape.transform.position.y + 20,
      });
      
      slide.addShape(clonedShape);
      newShapeIds.push(clonedShape.id);
    });
    
    // Select the newly duplicated shapes
    set({ presentation, selectedShapeIds: newShapeIds });
  },

  pasteShapes: () => {
    const { presentation, currentSlideId, copiedShapes } = get();
    if (!presentation || !currentSlideId || copiedShapes.length === 0) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    get().saveHistory();
    
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
    
    set({ presentation, selectedShapeIds: newShapeIds });
  },

  deleteSelected: () => {
    const { presentation, currentSlideId, selectedShapeIds } = get();
    if (!presentation || !currentSlideId || selectedShapeIds.length === 0) return;
    
    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;
    
    get().saveHistory();
    selectedShapeIds.forEach(id => slide.removeShape(id));
    
    set({ presentation, selectedShapeIds: [] });
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

  setSelectionRect: (rect) => {
    set({ selectionRect: rect });
  },

  selectShapesInRect: (rect) => {
    const { presentation, currentSlideId, zoom, pan } = get();
    if (!presentation || !currentSlideId) return;

    const slide = presentation.getSlide(currentSlideId);
    if (!slide) return;

    // Convert screen coordinates to canvas coordinates
    const startX = (rect.start.x - pan.x) / zoom;
    const startY = (rect.start.y - pan.y) / zoom;
    const endX = (rect.end.x - pan.x) / zoom;
    const endY = (rect.end.y - pan.y) / zoom;

    const selectionLeft = Math.min(startX, endX);
    const selectionRight = Math.max(startX, endX);
    const selectionTop = Math.min(startY, endY);
    const selectionBottom = Math.max(startY, endY);

    // Select shapes that are FULLY inside the rectangle
    const selectedIds = slide.shapes
      .filter(shape => {
        const shapeLeft = shape.transform.position.x;
        const shapeTop = shape.transform.position.y;
        const shapeRight = shapeLeft + shape.transform.size.width;
        const shapeBottom = shapeTop + shape.transform.size.height;

        const fullyInside = (
          shapeLeft >= selectionLeft &&
          shapeRight <= selectionRight &&
          shapeTop >= selectionTop &&
          shapeBottom <= selectionBottom
        );

        // Shape is fully inside if all its corners are inside the selection rect
        return fullyInside;
      })
      .map(shape => shape.id);

    set({ selectedShapeIds: selectedIds });
  },

  setGroupTransformer: (transformer) => {
    set({ groupTransformer: transformer });
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
      selectedShapeIds: [],
      version: get().version + 1,
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
      selectedShapeIds: [],
      version: get().version + 1,
      history: {
        past: [...history.past, currentState],
        future: history.future.slice(1),
      },
    });
  },

  refreshUI: () => {
    set({ version: get().version + 1 });
  },
}));
