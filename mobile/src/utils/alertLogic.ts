/**
 * Pure logic for threshold-crossing detection.
 * Extracted here so it's testable without React or Firebase.
 */

/**
 * Given the previous level, the new level, and the user's configured thresholds,
 * returns the thresholds that were crossed upward (i.e. oldLevel < T <= newLevel).
 *
 * A threshold is "crossed" when the previous level was strictly below it
 * and the new level is at or above it. This prevents notifying on every
 * measurement that happens to be above the threshold — only on the actual crossing.
 *
 * If oldLevel is null (first measurement ever), all thresholds <= newLevel are crossed.
 */
export function crossedThresholds(
  oldLevel: number | null,
  newLevel: number | null,
  thresholds: number[],
): number[] {
  if (newLevel == null || thresholds.length === 0) return [];

  return thresholds.filter((t) => {
    if (oldLevel == null) return newLevel >= t;
    return oldLevel < t && newLevel >= t;
  });
}

/**
 * Returns the highest crossed threshold (most urgent), or null if none crossed.
 */
export function highestCrossed(
  oldLevel: number | null,
  newLevel: number | null,
  thresholds: number[],
): number | null {
  const crossed = crossedThresholds(oldLevel, newLevel, thresholds);
  return crossed.length > 0 ? Math.max(...crossed) : null;
}
