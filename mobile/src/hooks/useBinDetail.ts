import { useEffect, useState } from 'react';

import { fetchReadingsHistory, observeReadings } from '../services/firebase/binObservers';
import type { BinReading } from '../types/bin';

type ReadingsState = 'loading' | 'ready' | 'error';

interface BinDetailState {
  readings: BinReading[];
  readingsState: ReadingsState;
  readingsError: string | null;
}

/**
 * Removes consecutive readings with the same level, keeping only the first
 * occurrence of each level change. Used for the real-time observer (recent readings).
 */
function deduplicateReadings(readings: BinReading[]): BinReading[] {
  if (readings.length === 0) return readings;
  const result: BinReading[] = [readings[0]];
  for (let i = 1; i < readings.length; i++) {
    if (readings[i].level !== readings[i - 1].level) result.push(readings[i]);
  }
  return result;
}

/**
 * Subscribes to real-time readings for a single bin.
 * - Uses observeReadings (limit 500) for the real-time level display.
 * - Uses fetchReadingsHistory (limit 5000, one-shot) for the full history,
 *   so that all days appear in the timeline without loading 5000 live listeners.
 *
 * The history fetch runs once on mount and again whenever binId/uid change.
 * The real-time observer updates the latest readings continuously.
 * The final `readings` state merges both: history is the base, and any new
 * real-time reading that differs from the last is prepended.
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
    let historyLoaded = false;
    let historyReadings: BinReading[] = [];
    let liveReadings: BinReading[] = [];

    function merge(): BinReading[] {
      if (!historyLoaded) return liveReadings;
      if (liveReadings.length === 0) return historyReadings;
      // Prepend any live readings newer than the first history entry
      const historyFirst = historyReadings[0];
      const newer = historyFirst
        ? liveReadings.filter((r) => r.timestamp > historyFirst.timestamp)
        : liveReadings;
      const combined = [...newer, ...historyReadings];
      // Deduplicate the merged result
      if (combined.length === 0) return combined;
      const result: BinReading[] = [combined[0]];
      for (let i = 1; i < combined.length; i++) {
        if (combined[i].level !== combined[i - 1].level) result.push(combined[i]);
      }
      return result;
    }

    // 1. One-shot history fetch (all days, deduplicated)
    fetchReadingsHistory(binId, uid).then((history) => {
      if (!active) return;
      historyReadings = history;
      historyLoaded = true;
      setState({ readings: merge(), readingsState: 'ready', readingsError: null });
    }).catch((error) => {
      if (!active) return;
      const code = (error as { code?: string }).code;
      const message =
        code === 'permission-denied' ? 'Sem permissão para ler o histórico.' :
        code === 'unavailable' ? 'Serviço indisponível. Verifique sua conexão.' :
        'Não foi possível carregar o histórico.';
      setState({ readings: [], readingsState: 'error', readingsError: message });
    });

    // 2. Real-time observer for latest readings (level display + new entries)
    const unsub = observeReadings(
      binId,
      uid,
      (readings) => {
        if (!active) return;
        liveReadings = deduplicateReadings(readings);
        setState({ readings: merge(), readingsState: historyLoaded ? 'ready' : 'loading', readingsError: null });
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
