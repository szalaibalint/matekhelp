import { Presentation, Slide } from '../models';
import type { PresentationData } from '../types';
import { ShapeFactory } from './ShapeFactory';

export class PresentationService {
  private static instance: PresentationService;

  private constructor() {}

  static getInstance(): PresentationService {
    if (!PresentationService.instance) {
      PresentationService.instance = new PresentationService();
    }
    return PresentationService.instance;
  }

  createPresentation(name?: string): Presentation {
    return new Presentation(name);
  }

  loadPresentation(data: PresentationData): Presentation {
    const presentation = new Presentation();
    presentation.fromData(data);
    
    // Load slides with shapes
    presentation.slides = data.slides.map(slideData => {
      const slide = new Slide();
      slide.fromData(slideData, (shapeData) => ShapeFactory.fromData(shapeData));
      return slide;
    });

    return presentation;
  }

  savePresentation(presentation: Presentation): PresentationData {
    return presentation.toData();
  }

  exportToJSON(presentation: Presentation): string {
    return JSON.stringify(presentation.toData(), null, 2);
  }

  importFromJSON(json: string): Presentation {
    const data: PresentationData = JSON.parse(json);
    return this.loadPresentation(data);
  }

  // Future: Save to Supabase
  async saveToDatabase(presentation: Presentation): Promise<void> {
    const data = this.savePresentation(presentation);
    // TODO: Implement Supabase save
    console.log('Saving to database:', data);
  }

  // Future: Load from Supabase
  async loadFromDatabase(presentationId: string): Promise<Presentation> {
    // TODO: Implement Supabase load
    console.log('Loading from database:', presentationId);
    throw new Error('Not implemented yet');
  }
}
