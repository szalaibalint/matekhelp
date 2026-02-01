import { v4 as uuidv4 } from 'uuid';
import { ShapeType } from '../types';
import type { ShapeData, Transform, Color, Position, Size } from '../types';

export abstract class Shape {
  id: string;
  type: ShapeType;
  transform: Transform;
  color: Color;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;

  constructor(type: ShapeType, position: Position, size: Size) {
    this.id = uuidv4();
    this.type = type;
    this.transform = {
      position,
      size,
      rotation: 0,
      scale: 1,
    };
    this.color = {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2,
    };
    this.opacity = 1;
    this.visible = true;
    this.locked = false;
    this.zIndex = 0;
  }

  setPosition(position: Position): void {
    this.transform.position = position;
  }

  setSize(size: Size): void {
    this.transform.size = size;
  }

  setRotation(rotation: number): void {
    this.transform.rotation = rotation;
  }

  setScale(scale: number): void {
    this.transform.scale = scale;
  }

  setFillColor(color: string): void {
    this.color.fill = color;
  }

  setStrokeColor(color: string): void {
    this.color.stroke = color;
  }

  setStrokeWidth(width: number): void {
    this.color.strokeWidth = width;
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
  }

  setZIndex(zIndex: number): void {
    this.zIndex = zIndex;
  }

  clone(): Shape {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, JSON.parse(JSON.stringify(this)));
    cloned.id = uuidv4();
    return cloned;
  }

  abstract toData(): ShapeData;
  abstract fromData(data: ShapeData): void;
}

export class RectangleShape extends Shape {
  constructor(position: Position, size: Size) {
    super(ShapeType.RECTANGLE, position, size);
  }

  toData(): ShapeData {
    return {
      id: this.id,
      type: this.type,
      transform: this.transform,
      color: this.color,
      opacity: this.opacity,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex,
    };
  }

  fromData(data: ShapeData): void {
    Object.assign(this, data);
  }
}

export class CircleShape extends Shape {
  constructor(position: Position, size: Size) {
    super(ShapeType.CIRCLE, position, size);
  }

  toData(): ShapeData {
    return {
      id: this.id,
      type: this.type,
      transform: this.transform,
      color: this.color,
      opacity: this.opacity,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex,
    };
  }

  fromData(data: ShapeData): void {
    Object.assign(this, data);
  }
}

export class TriangleShape extends Shape {
  constructor(position: Position, size: Size) {
    super(ShapeType.TRIANGLE, position, size);
  }

  toData(): ShapeData {
    return {
      id: this.id,
      type: this.type,
      transform: this.transform,
      color: this.color,
      opacity: this.opacity,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex,
    };
  }

  fromData(data: ShapeData): void {
    Object.assign(this, data);
  }
}

export class TextShape extends Shape {
  text: string;
  fontSize: number;
  fontFamily: string;

  constructor(position: Position, text: string = 'Text') {
    super(ShapeType.TEXT, position, { width: 200, height: 50 });
    this.text = text;
    this.fontSize = 24;
    this.fontFamily = 'Arial';
    this.color.fill = '#000000';
    this.color.stroke = 'transparent';
  }

  setText(text: string): void {
    this.text = text;
  }

  setFontSize(size: number): void {
    this.fontSize = size;
  }

  setFontFamily(family: string): void {
    this.fontFamily = family;
  }

  toData(): ShapeData {
    return {
      id: this.id,
      type: this.type,
      transform: this.transform,
      color: this.color,
      opacity: this.opacity,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex,
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
    };
  }

  fromData(data: ShapeData): void {
    Object.assign(this, data);
    this.text = data.text || 'Text';
    this.fontSize = data.fontSize || 24;
    this.fontFamily = data.fontFamily || 'Arial';
  }
}

export class ImageShape extends Shape {
  imageUrl: string;

  constructor(position: Position, size: Size, imageUrl: string) {
    super(ShapeType.IMAGE, position, size);
    this.imageUrl = imageUrl;
  }

  setImageUrl(url: string): void {
    this.imageUrl = url;
  }

  toData(): ShapeData {
    return {
      id: this.id,
      type: this.type,
      transform: this.transform,
      color: this.color,
      opacity: this.opacity,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex,
      imageUrl: this.imageUrl,
    };
  }

  fromData(data: ShapeData): void {
    Object.assign(this, data);
    this.imageUrl = data.imageUrl || '';
  }
}

export class LineShape extends Shape {
  points: number[];

  constructor(position: Position, points: number[] = [0, 0, 100, 100]) {
    super(ShapeType.LINE, position, { width: 100, height: 100 });
    this.points = points;
    this.color.fill = 'transparent';
  }

  setPoints(points: number[]): void {
    this.points = points;
  }

  toData(): ShapeData {
    return {
      id: this.id,
      type: this.type,
      transform: this.transform,
      color: this.color,
      opacity: this.opacity,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex,
      points: this.points,
    };
  }

  fromData(data: ShapeData): void {
    Object.assign(this, data);
    this.points = data.points || [0, 0, 100, 100];
  }
}

export class ArrowShape extends LineShape {
  constructor(position: Position, points: number[] = [0, 0, 100, 100]) {
    super(position, points);
    this.type = ShapeType.ARROW;
  }
}
