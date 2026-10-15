import { useRef, useState } from 'react';

import { INITIAL_PREVIEW_BINS } from '../constants/binPreview';
import type { BinPreview, PreviewState } from '../types/bin';

export function useBinPreview(): {
  bins: BinPreview[]; state: PreviewState; setState: (state: PreviewState) => void;
  add: (name: string, location: string) => string;
  update: (id: string, name: string, location: string) => void;
} {
  const [bins, setBins] = useState(INITIAL_PREVIEW_BINS);
  const [state, setState] = useState<PreviewState>('ready');
  const sequence = useRef(0);
  function add(name: string, location: string): string {
    sequence.current += 1;
    const id = `preview-${sequence.current.toString()}`;
    setBins((items) => [...items, { id, name: name.trim(), location: location.trim() || 'Local não informado', level: null, battery: null, lastReading: null, history: [] }]);
    setState('ready');
    return id;
  }
  function update(id: string, name: string, location: string): void {
    setBins((items) => items.map((bin) => bin.id === id ? { ...bin, name: name.trim(), location: location.trim() || 'Local não informado' } : bin));
  }
  return { bins, state, setState, add, update };
}
