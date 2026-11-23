import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import type { Bin, BinReading } from '../../types/bin';
import type { AlertSettings } from '../../types/alert';

import { getFirebaseClient } from './client';
import { toBin, toReading } from './binGateway';

const MAX_HISTORY = 500; // usado apenas para o observer de nível atual
const MAX_HISTORY_FETCH = 5000; // busca completa para histórico deduplificado

/**
 * Listen to all bins where `uid` is in the `members` array.
 * Requires a composite index on `bins`: (members ASC, nome ASC).
 * Returns an unsubscribe function.
 */
export function observeBins(
  uid: string,
  next: (bins: Bin[]) => void,
  fail: (error: unknown) => void,
): () => void {
  const client = getFirebaseClient();
  if (!client) { next([]); return () => undefined; }

  const q = query(
    collection(client.db, 'bins'),
    where('members', 'array-contains', uid),
    orderBy('nome'),
  );

  return onSnapshot(q, { includeMetadataChanges: false },
    (snap) => {
      next(snap.docs.map((d) => toBin(d.id, d.data() as Record<string, unknown>)));
    },
    fail,
  );
}

/**
 * Listen to a single bin document for real-time level/status updates.
 * Returns an unsubscribe function.
 */
export function observeBin(
  binId: string,
  next: (bin: Bin | null) => void,
  fail: (error: unknown) => void,
): () => void {
  const client = getFirebaseClient();
  if (!client) { next(null); return () => undefined; }

  return onSnapshot(doc(client.db, 'bins', binId), { includeMetadataChanges: true },
    (snap) => {
      if (snap.metadata.fromCache && !snap.exists()) return;
      next(snap.exists() ? toBin(snap.id, snap.data() as Record<string, unknown>) : null);
    },
    fail,
  );
}

/**
 * Listen to recent measurements for a bin where `uid` is in `members`.
 * Requires a composite index on `measurements`: (members ASC, binId ASC, timestamp DESC).
 * Returns an unsubscribe function.
 */
export function observeReadings(
  binId: string,
  uid: string,
  next: (readings: BinReading[]) => void,
  fail: (error: unknown) => void,
): () => void {
  const client = getFirebaseClient();
  if (!client) { next([]); return () => undefined; }

  const q = query(
    collection(client.db, 'measurements'),
    where('members', 'array-contains', uid),
    where('binId', '==', binId),
    orderBy('timestamp', 'desc'),
    limit(MAX_HISTORY),
  );

  return onSnapshot(q, { includeMetadataChanges: false },
    (snap) => {
      next(snap.docs.map((d) => toReading(d.id, d.data() as Record<string, unknown>)));
    },
    fail,
  );
}

// ---------- History fetch (one-shot, deduplicated) ----------

/**
 * Fetches readings for a bin from the last 30 days, removes heartbeat duplicates and returns
 * only readings where the level actually changed.
 * Uses getDocs (one-shot) instead of onSnapshot to avoid holding a large listener.
 * Limited to last 30 days to avoid Firestore quota exhaustion.
 */
export async function fetchReadingsHistory(
  binId: string,
  uid: string,
): Promise<BinReading[]> {
  const client = getFirebaseClient();
  if (!client) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const q = query(
    collection(client.db, 'measurements'),
    where('members', 'array-contains', uid),
    where('binId', '==', binId),
    where('timestamp', '>=', thirtyDaysAgo),
    orderBy('timestamp', 'desc'),
    limit(MAX_HISTORY_FETCH),
  );

  const snap = await getDocs(q);
  const all = snap.docs.map((d) => toReading(d.id, d.data() as Record<string, unknown>));

  // 1. Deduplicate consecutive same-level readings (heartbeat noise)
  if (all.length === 0) return all;
  const deduped: BinReading[] = [all[0]];
  for (let i = 1; i < all.length; i++) {
    if (all[i].level !== all[i - 1].level) deduped.push(all[i]);
  }

  // 2. Remove sensor glitches: A → B → A pattern where B lasts < 3 minutes
  //    Example: 12% → 48% → 12% in 2 minutes → remove the 48%
  const filtered: BinReading[] = [];
  const THREE_MINUTES_MS = 3 * 60 * 1000;

  for (let i = 0; i < deduped.length; i++) {
    const current = deduped[i];
    const next = deduped[i + 1];
    const afterNext = deduped[i + 2];

    // Check if this is a glitch: current.level === afterNext.level AND duration < 3 min
    if (next && afterNext) {
      const currentTime = new Date(current.timestamp).getTime();
      const afterNextTime = new Date(afterNext.timestamp).getTime();
      const durationMs = Math.abs(currentTime - afterNextTime);

      if (current.level === afterNext.level && durationMs < THREE_MINUTES_MS) {
        // Skip 'next' — it's a glitch between two stable readings
        filtered.push(current);
        i++; // skip next iteration (the glitch)
        continue;
      }
    }

    filtered.push(current);
  }

  return filtered;
}

// ---------- Alert settings ----------
/**
 * Listen to all alert settings for the given uid.
 * Returns an unsubscribe function.
 */
export function observeAlerts(
  uid: string,
  next: (alerts: AlertSettings[]) => void,
  fail: (error: unknown) => void,
): () => void {
  const client = getFirebaseClient();
  if (!client) { next([]); return () => undefined; }

  const q = query(
    collection(client.db, 'alertSettings'),
    where('uid', '==', uid),
  );

  return onSnapshot(q, { includeMetadataChanges: false },
    (snap) => {
      next(snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          uid: typeof data.uid === 'string' ? data.uid : '',
          binId: typeof data.binId === 'string' ? data.binId : '',
          thresholds: Array.isArray(data.thresholds) ? (data.thresholds as number[]) : [],
          enabled: typeof data.enabled === 'boolean' ? data.enabled : false,
          updatedAt: data.updatedAt != null
            ? (typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
              ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
              : String(data.updatedAt))
            : null,
        };
      }));
    },
    fail,
  );
}
