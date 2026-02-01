import { v4 as uuidv4 } from 'uuid';
import type { PresentationData } from '../types';
import { Slide } from './Slide';

export class Presentation {
  id: string;
  name: string;
  slides: Slide[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string;

  constructor(name: string = 'Untitled Presentation') {
    this.id = uuidv4();
    this.name = name;
    this.slides = [new Slide('Slide 1', 0)];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addSlide(slide?: Slide, index?: number): Slide {
    const newSlide = slide || new Slide(`Slide ${this.slides.length + 1}`, this.slides.length);
    
    if (index !== undefined && index >= 0 && index <= this.slides.length) {
      this.slides.splice(index, 0, newSlide);
    } else {
      this.slides.push(newSlide);
    }
    
    this.updateSlideOrder();
    this.updatedAt = new Date();
    return newSlide;
  }

  removeSlide(slideId: string): void {
    if (this.slides.length <= 1) {
      console.warn('Cannot remove the last slide');
      return;
    }
    
    this.slides = this.slides.filter(slide => slide.id !== slideId);
    this.updateSlideOrder();
    this.updatedAt = new Date();
  }

  getSlide(slideId: string): Slide | undefined {
    return this.slides.find(slide => slide.id === slideId);
  }

  getSlideByIndex(index: number): Slide | undefined {
    return this.slides[index];
  }

  duplicateSlide(slideId: string): Slide | null {
    const slide = this.getSlide(slideId);
    if (!slide) return null;

    const clonedSlide = slide.clone();
    const index = this.slides.findIndex(s => s.id === slideId);
    this.addSlide(clonedSlide, index + 1);
    return clonedSlide;
  }

  moveSlide(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.slides.length ||
        toIndex < 0 || toIndex >= this.slides.length) {
      return;
    }

    const [movedSlide] = this.slides.splice(fromIndex, 1);
    this.slides.splice(toIndex, 0, movedSlide);
    this.updateSlideOrder();
    this.updatedAt = new Date();
  }

  private updateSlideOrder(): void {
    this.slides.forEach((slide, index) => {
      slide.order = index;
    });
  }

  setName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  toData(): PresentationData {
    return {
      id: this.id,
      name: this.name,
      slides: this.slides.map(slide => slide.toData()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userId: this.userId,
    };
  }

  fromData(data: PresentationData): void {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
    this.userId = data.userId;
    // Slides will be loaded separately with their shapes
  }
}
