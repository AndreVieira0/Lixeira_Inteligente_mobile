// ---------- Mock types (demo mode) ----------

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

// ---------- Domain types (Firebase mode) ----------

/** Status strings as written by the ESP32 firmware. */
export type BinStatus =
  | 'Normal'
  | 'Atencao'
  | 'Proxima de cheia'
  | 'Critica'
  | 'Cheia';

/** Human-readable labels for each firmware status value. */
export const BIN_STATUS_LABEL: Record<BinStatus, string> = {
  Normal: 'Normal',
  Atencao: 'Atenção',
  'Proxima de cheia': 'Próxima de cheia',
  Critica: 'Crítica',
  Cheia: 'Cheia',
};

/**
 * Percentage thresholds that map to each status, matching the firmware logic:
 *   <= 50  → Normal
 *   <= 79  → Atencao
 *   <= 89  → Proxima de cheia
 *   < 100  → Critica
 *   == 100 → Cheia
 */
export function binStatusFromLevel(level: number): BinStatus {
  if (level <= 50) return 'Normal';
  if (level <= 79) return 'Atencao';
  if (level <= 89) return 'Proxima de cheia';
  if (level < 100) return 'Critica';
  return 'Cheia';
}

/** A waste bin as stored in Firestore `bins/{binId}`. */
export interface Bin {
  /** Firestore document ID (e.g. "BIN-0001"). */
  id: string;
  /** Display name set by the owner. */
  name: string;
  /** Optional location string set by the owner. */
  local: string;
  /** UID of the user who claimed this bin. */
  ownerId: string;
  /** All UIDs authorised to read this bin (includes owner). Max 10. */
  members: string[];
  /** Latest fill level 0–100 written by the ESP32. */
  currentLevel: number | null;
  /** Latest status string written by the ESP32. */
  status: BinStatus | null;
  /** ISO string of the latest ESP32 update (from a Firestore Timestamp). */
  lastUpdate: string | null;
}

/** A single measurement as stored in Firestore `measurements/{id}`. */
export interface BinReading {
  /** Firestore document ID. */
  id: string;
  /** Firestore document ID of the associated bin (e.g. "BIN-0001"). */
  binId: string;
  /** Fill level 0–100. */
  level: number;
  /** Why this measurement was sent. */
  reason: 'level_change' | 'reconnection';
  /** ISO string of the measurement timestamp. */
  timestamp: string;
}

/** Gateway interface — one implementation per backend. */
export interface BinGateway {
  /** Fetch all bins where the given uid is in the `members` array. */
  listBins(uid: string): Promise<Bin[]>;
  /** Get a single bin by ID (returns null if not found or not a member). */
  getBin(binId: string): Promise<Bin | null>;
  /**
   * Claim an unclaimed bin inside a transaction. Throws if already claimed.
   * Sets ownerId, members: [uid], name and local.
   */
  claimBin(binId: string, uid: string, name: string, local: string): Promise<void>;
  /** Update mutable metadata (name and local) for a bin the caller owns. */
  updateBinMeta(binId: string, name: string, local: string): Promise<void>;
  /** Add a member UID to the bin's members array (owner only). */
  addMember(binId: string, uid: string): Promise<void>;
  /** Remove a member UID from the bin's members array (owner only, cannot remove self). */
  removeMember(binId: string, uid: string): Promise<void>;
  /** Fetch recent readings for a bin ordered by timestamp descending. */
  listReadings(binId: string, uid: string, limitCount: number): Promise<BinReading[]>;
}
