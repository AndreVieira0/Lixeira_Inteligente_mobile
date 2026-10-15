export interface BinPreview {
  id: string;
  name: string;
  location: string;
  level: number | null;
  battery: number | null;
  lastReading: string | null;
  history: { time: string; level: number }[];
}

export type PreviewState = 'ready' | 'loading' | 'empty' | 'error';
