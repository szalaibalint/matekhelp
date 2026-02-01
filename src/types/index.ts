export const ShapeType = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  TEXT: 'text',
  IMAGE: 'image',
  LINE: 'line',
  ARROW: 'arrow',
} as const;

export type ShapeType = typeof ShapeType[keyof typeof ShapeType];

export const ToolType = {
  SELECT: 'select',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  TEXT: 'text',
  IMAGE: 'image',
  LINE: 'line',
  ARROW: 'arrow',
  PAN: 'pan',
} as const;

export type ToolType = typeof ToolType[keyof typeof ToolType];

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Color {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface Transform {
  position: Position;
  size: Size;
  rotation: number;
  scale: number;
}

export interface ShapeData {
  id: string;
  type: ShapeType;
  transform: Transform;
  color: Color;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  // Shape-specific properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  imageUrl?: string;
  points?: number[];
}

export interface SlideData {
  id: string;
  name: string;
  shapes: ShapeData[];
  background: string;
  order: number;
  thumbnail?: string;
}

export interface PresentationData {
  id: string;
  name: string;
  slides: SlideData[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface CanvasState {
  zoom: number;
  pan: Position;
  selectedShapeIds: string[];
  copiedShapes: ShapeData[];
}

export interface HistoryState {
  past: SlideData[];
  present: SlideData;
  future: SlideData[];
}
