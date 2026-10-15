import type { BinPreview } from '../types/bin';

export const INITIAL_PREVIEW_BINS: BinPreview[] = [{
  id: 'preview-coordenacao', name: 'Lixeira da coordenação', location: 'Faculdade · Coordenação',
  level: 82, battery: null, lastReading: 'Hoje, 10:30',
  history: [{ time: '08:00', level: 24 }, { time: '09:00', level: 48 }, { time: '10:00', level: 70 }, { time: '10:30', level: 82 }],
}];
export const PREVIEW_COLLECTION_LEVEL = 80;
