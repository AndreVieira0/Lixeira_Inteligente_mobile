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
 * Removes consecutive readings with the same level, keeping only the first
 * occurrence of each level change. Readings arrive in descending order
 * (most recent first), so we deduplicate in that order.
 *
 * Example: [59, 59, 59, 62, 62, 60] → [59, 62, 60]
 */
function deduplicateReadings(readings: BinReading[]): BinReading[] {
  if (readings.length === 0) return readings;
  const result: BinReading[] = [readings[0]];
  for (let i = 1; i < readings.length; i++) {
    if (readings[i].level !== readings[i - 1].level) {
      result.push(readings[i]);
    }
  }
  return result;
}

/**
 * Subscribes to real-time readings for a single bin.
 * Only active in Firebase mode — when uid and binId are provided.
 * Cleans up the Firestore listener on unmount or when ids change.
 * Deduplicates consecutive readings with the same level (heartbeat noise).
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
        setState({
          readings: deduplicateReadings(readings),
          readingsState: 'ready',
          readingsError: null,
        });
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
