import { supabase } from '../../supabase/supabase';
import { toast } from '../components/ui/use-toast';

export interface Slide {
  id: string;
  type: 'text' | 'heading' | 'image' | 'multiple_choice' | 'ranking' | 'matching' | 'true_false' | 'fill_in_blanks';
  title: string;
  content: any;
  settings: any;
  sort_order: number;
  points: number;
  correct_answer: any;
  backgroundColor?: string;
  textColor?: string;
}

export const loadSlides = async (presentationId: string): Promise<Slide[]> => {
  const { data } = await supabase
    .from('slides')
    .select('*')
    .eq('presentation_id', presentationId)
    .order('sort_order');

  if (!data) return [];

  // Map database column names to interface properties
  return data.map(slide => ({
    ...slide,
    backgroundColor: slide.background_color,
    textColor: slide.text_color
  }));
};

export const saveSlides = async (presentationId: string, slides: Slide[]) => {
  await supabase.from('slides').delete().eq('presentation_id', presentationId);

  if (slides.length > 0) {
    const slidesToInsert = slides.map((slide, index) => ({
      presentation_id: presentationId,
      type: slide.type,
      title: slide.title,
      content: slide.content,
      settings: slide.settings,
      sort_order: index,
      points: slide.points || 0,
      correct_answer: slide.correct_answer,
      background_color: slide.backgroundColor,
      text_color: slide.textColor
    }));

    await supabase.from('slides').insert(slidesToInsert);
  }
};

export const getDefaultTitle = (type: Slide['type']) => {
  const titles = {
    text: 'Szöveges dia',
    heading: 'Címsor dia',
    image: 'Képes dia',
    multiple_choice: 'Feleletválasztós kérdés',
    ranking: 'Sorrendbe rakás',
    matching: 'Párosítás',
    true_false: 'Igaz/Hamis',
    fill_in_blanks: 'Szöveg kiegészítés'
  };
  return titles[type];
};

export const getDefaultContent = (type: Slide['type']) => {
  switch (type) {
    case 'text':
      return [{ type: 'paragraph', children: [{ text: 'Kezdj el írni...' }] }];
    case 'heading':
      return { text: 'Címsor', subtitle: 'Alcím', fontSize: 48 };
    case 'image':
      return { url: '', caption: '' };
    case 'multiple_choice':
      return {
        question: 'Itt a kérdésed?',
        options: [
          { text: '1. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
          { text: '2. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
          { text: '3. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
          { text: '4. opció', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' }
        ],
        layout: 'grid',
        multipleCorrect: false
      };
    case 'ranking':
      return {
        question: 'Rakd sorrendbe ezeket az elemeket',
        items: [
          { text: '1. elem', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
          { text: '2. elem', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' },
          { text: '3. elem', textColor: '#000000', bgColor: '#ffffff', borderColor: '#d1d5db' }
        ],
        correctOrder: [0, 1, 2]
      };
    case 'matching':
      return {
        question: 'Párosítsd össze az elemeket',
        pairs: [
          { left: 'Elem 1', right: 'Párosítás 1', leftColor: '#ffffff', rightColor: '#ffffff' },
          { left: 'Elem 2', right: 'Párosítás 2', leftColor: '#ffffff', rightColor: '#ffffff' },
          { left: 'Elem 3', right: 'Párosítás 3', leftColor: '#ffffff', rightColor: '#ffffff' }
        ],
        pointsPerPair: 1
      };
    case 'true_false':
      return {
        statement: 'Ez egy igaz állítás',
        correctAnswer: true
      };
    case 'fill_in_blanks':
      return {
        content: [{ type: 'paragraph', children: [{ text: 'Kezdj el írni és illessz be kitöltendő mezőket...' }] }],
        blanks: [] // { id: string, answer: string, color: string }
      };
    default:
      return {};
  }
};
