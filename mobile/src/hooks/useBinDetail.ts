import { useEffect, useState } from 'react';

import { observeReadings } from '../services/firebase/binObservers';
import type { BinReading } from '../types/bin';

type ReadingsState = 'loading' | 'ready' | 'error';

interface BinDetailState {
  readings: BinReading[];
  readingsState: ReadingsState;
  readingsError: string | null;
}

/**
 * Subscribes to real-time readings for a single bin.
 * Only active in Firebase mode — when uid and binId are provided.
 * Cleans up the Firestore listener on unmount or when ids change.
 */
export function useBinDetail(binId: string, uid: string): BinDetailState {
  const [state, setState] = useState<BinDetailState>({
    readings: [],
    readingsState: 'loading',
    readingsError: null,
  });

  useEffect(() => {
    if (!binId || !uid) {
      setState({ readings: [], readingsState: 'ready', readingsError: null });
      return;
    }

    setState({ readings: [], readingsState: 'loading', readingsError: null });
    let active = true;

    const unsub = observeReadings(
      binId,
      uid,
      (readings) => {
        if (!active) return;
        setState({ readings, readingsState: 'ready', readingsError: null });
      },
      (error) => {
        if (!active) return;
        const code = (error as { code?: string }).code;
        const message =
          code === 'permission-denied' ? 'Sem permissão para ler o histórico.' :
          code === 'unavailable' ? 'Serviço indisponível. Verifique sua conexão.' :
          'Não foi possível carregar o histórico.';
        setState({ readings: [], readingsState: 'error', readingsError: message });
      },
    );

    return () => {
      active = false;
      unsub();
    };
  }, [binId, uid]);

  return state;
}
