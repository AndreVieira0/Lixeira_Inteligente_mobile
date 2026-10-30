import type { BinReading } from '../types/bin';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface BinStats {
  avg: number;
  max: number;
  min: number;
  trend: 'up' | 'down' | 'stable';
  trendDelta: number;
  fillRate: number;   // % de medições >= 80%
  reconCount: number; // nº de reconexões
}

// ── Cálculo ──────────────────────────────────────────────────────────────────

/**
 * Computes summary statistics from an array of readings.
 * Readings are assumed to arrive in descending order (most recent first),
 * matching the Firestore query `orderBy('timestamp', 'desc')`.
 */
export function computeStats(readings: BinReading[]): BinStats {
  if (readings.length === 0) {
    return { avg: 0, max: 0, min: 0, trend: 'stable', trendDelta: 0, fillRate: 0, reconCount: 0 };
  }

  const levels = readings.map((r) => r.level);
  const avg = Math.round(levels.reduce((s, v) => s + v, 0) / levels.length);
  const max = Math.max(...levels);
  const min = Math.min(...levels);

  // Trend: compare average of the first half (most recent) with the second half (older)
  const mid = Math.floor(readings.length / 2);
  const recent = levels.slice(0, mid || 1);
  const older  = levels.slice(mid || 1);
  const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgOlder  = older.length ? older.reduce((s, v) => s + v, 0) / older.length : avgRecent;
  const delta = Math.round(avgRecent - avgOlder);
  const trend: BinStats['trend'] = delta > 3 ? 'up' : delta < -3 ? 'down' : 'stable';

  const fillRate = Math.round((levels.filter((l) => l >= 80).length / levels.length) * 100);
  const reconCount = readings.filter((r) => r.reason === 'reconnection').length;

  return { avg, max, min, trend, trendDelta: Math.abs(delta), fillRate, reconCount };
}

// ── Helpers de cor por nível ──────────────────────────────────────────────────

/**
 * Returns a hex color string appropriate for the given fill level,
 * matching the firmware status thresholds.
 */
export function levelColor(level: number): string {
  if (level >= 90) return '#A12F35';   // danger — Crítica/Cheia
  if (level >= 80) return '#CC5A00';   // orange — Próxima de cheia
  if (level >= 50) return '#B07C00';   // amber — Atenção
  return '#226C4C';                    // primary — Normal
}

/**
 * Returns a soft background hex color for the given fill level.
 */
export function levelBg(level: number): string {
  if (level >= 90) return '#FFF0EF';   // dangerSoft
  if (level >= 80) return '#FFF3E8';
  if (level >= 50) return '#FFF8E1';
  return '#E8F2E8';                     // primarySoft
}
