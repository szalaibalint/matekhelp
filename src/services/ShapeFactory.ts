import { ShapeType } from '../types';
import type { ShapeData, Position, Size } from '../types';
import {
  Shape,
  RectangleShape,
  CircleShape,
  TriangleShape,
  TextShape,
  ImageShape,
  LineShape,
  ArrowShape,
} from '../models';

export class ShapeFactory {
  static createShape(type: ShapeType, position: Position, size?: Size): Shape {
    switch (type) {
      case ShapeType.RECTANGLE:
        return new RectangleShape(position, size || { width: 100, height: 100 });
      case ShapeType.CIRCLE:
        return new CircleShape(position, size || { width: 100, height: 100 });
      case ShapeType.TRIANGLE:
        return new TriangleShape(position, size || { width: 100, height: 100 });
      case ShapeType.TEXT:
        return new TextShape(position);
      case ShapeType.IMAGE:
        return new ImageShape(position, size || { width: 200, height: 200 }, '');
      case ShapeType.LINE:
        return new LineShape(position);
      case ShapeType.ARROW:
        return new ArrowShape(position);
      default:
        throw new Error(`Unknown shape type: ${type}`);
    }
  }

  static fromData(data: ShapeData): Shape {
    const shape = this.createShape(data.type, data.transform.position, data.transform.size);
    shape.fromData(data);
    return shape;
  }
}
