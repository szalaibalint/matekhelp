import { v4 as uuidv4 } from 'uuid';
import type { SlideData, ShapeData } from '../types';
import { Shape } from './Shape';

export class Slide {
  id: string;
  name: string;
  shapes: Shape[];
  background: string;
  order: number;
  thumbnail?: string;

  constructor(name: string = 'Untitled Slide', order: number = 0) {
    this.id = uuidv4();
    this.name = name;
    this.shapes = [];
    this.background = '#ffffff';
    this.order = order;
  }

  addShape(shape: Shape): void {
    this.shapes.push(shape);
    this.updateZIndices();
  }

  removeShape(shapeId: string): void {
    this.shapes = this.shapes.filter(shape => shape.id !== shapeId);
    this.updateZIndices();
  }

  getShape(shapeId: string): Shape | undefined {
    return this.shapes.find(shape => shape.id === shapeId);
  }

  updateShape(shapeId: string, updates: Partial<ShapeData>): void {
    const shape = this.getShape(shapeId);
    if (shape) {
      Object.assign(shape, updates);
    }
  }

  moveShapeToFront(shapeId: string): void {
    const shape = this.getShape(shapeId);
    if (shape) {
      const maxZIndex = Math.max(...this.shapes.map(s => s.zIndex), 0);
      shape.setZIndex(maxZIndex + 1);
    }
  }

  moveShapeToBack(shapeId: string): void {
    const shape = this.getShape(shapeId);
    if (shape) {
      const minZIndex = Math.min(...this.shapes.map(s => s.zIndex), 0);
      shape.setZIndex(minZIndex - 1);
    }
  }

  moveShapeForward(shapeId: string): void {
    const shape = this.getShape(shapeId);
    if (shape) {
      shape.setZIndex(shape.zIndex + 1);
    }
  }

  moveShapeBackward(shapeId: string): void {
    const shape = this.getShape(shapeId);
    if (shape) {
      shape.setZIndex(shape.zIndex - 1);
    }
  }

  private updateZIndices(): void {
    this.shapes.sort((a, b) => a.zIndex - b.zIndex);
    this.shapes.forEach((shape, index) => {
      shape.setZIndex(index);
    });
  }

  setBackground(color: string): void {
    this.background = color;
  }

  setName(name: string): void {
    this.name = name;
  }

  clone(): Slide {
    const cloned = new Slide(this.name + ' (Copy)', this.order);
    cloned.background = this.background;
    cloned.shapes = this.shapes.map(shape => shape.clone());
    return cloned;
  }

  toData(): SlideData {
    return {
      id: this.id,
      name: this.name,
      shapes: this.shapes.map(shape => shape.toData()),
      background: this.background,
      order: this.order,
      thumbnail: this.thumbnail,
    };
  }

  fromData(data: SlideData, shapeFactory: (shapeData: ShapeData) => Shape): void {
    this.id = data.id;
    this.name = data.name;
    this.background = data.background;
    this.order = data.order;
    this.thumbnail = data.thumbnail;
    this.shapes = data.shapes.map(shapeData => shapeFactory(shapeData));
  }
}
