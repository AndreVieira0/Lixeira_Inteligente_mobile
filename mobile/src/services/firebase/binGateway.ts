import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

import type { Bin, BinGateway, BinReading, BinStatus } from '../../types/bin';

// ---------- helpers (exported for use in binObservers) ----------

export function toBin(id: string, data: Record<string, unknown>): Bin {
  return {
    id,
    name: typeof data.nome === 'string' ? data.nome : '',
    local: typeof data.local === 'string' ? data.local : '',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    members: Array.isArray(data.members) ? (data.members as string[]) : [],
    currentLevel: typeof data.currentLevel === 'number' ? data.currentLevel : null,
    status: typeof data.status === 'string' ? (data.status as BinStatus) : null,
    lastUpdate: data.lastUpdate != null
      ? (typeof (data.lastUpdate as { toDate?: () => Date }).toDate === 'function'
        ? (data.lastUpdate as { toDate: () => Date }).toDate().toISOString()
        : String(data.lastUpdate))
      : null,
  };
}

export function toReading(id: string, data: Record<string, unknown>): BinReading {
  return {
    id,
    binId: typeof data.binId === 'string' ? data.binId : '',
    level: typeof data.level === 'number' ? data.level : 0,
    reason: data.reason === 'reconnection' ? 'reconnection' : 'level_change',
    timestamp: data.timestamp != null
      ? (typeof (data.timestamp as { toDate?: () => Date }).toDate === 'function'
        ? (data.timestamp as { toDate: () => Date }).toDate().toISOString()
        : String(data.timestamp))
      : new Date(0).toISOString(),
  };
}

// ---------- factory ----------

export function createFirebaseBinGateway(db: Firestore): BinGateway {
  return {
    async listBins(uid) {
      const q = query(collection(db, 'bins'), where('members', 'array-contains', uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toBin(d.id, d.data() as Record<string, unknown>));
    },

    async getBin(binId) {
      const snap = await getDocFromServer(doc(db, 'bins', binId));
      if (!snap.exists()) return null;
      return toBin(snap.id, snap.data() as Record<string, unknown>);
    },

    async claimBin(binId, uid, name, local) {
      const ref = doc(db, 'bins', binId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new BinError('bin/not-found');
        const data = snap.data() as Record<string, unknown>;
        if ('ownerId' in data && data.ownerId) throw new BinError('bin/already-claimed');
        tx.update(ref, { ownerId: uid, members: [uid], nome: name.trim(), local: local.trim() });
      });
    },

    async updateBinMeta(binId, name, local) {
      await updateDoc(doc(db, 'bins', binId), { nome: name.trim(), local: local.trim() });
    },

    async addMember(binId, uid) {
      await updateDoc(doc(db, 'bins', binId), { members: arrayUnion(uid) });
    },

    async removeMember(binId, uid) {
      await updateDoc(doc(db, 'bins', binId), { members: arrayRemove(uid) });
    },

    async listReadings(binId, uid, limitCount) {
      // Composite index required: measurements (members ASC, binId ASC, timestamp DESC).
      const q = query(
        collection(db, 'measurements'),
        where('members', 'array-contains', uid),
        where('binId', '==', binId),
        orderBy('timestamp', 'desc'),
        limit(limitCount),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => toReading(d.id, d.data() as Record<string, unknown>));
    },
  };
}

// ---------- error ----------

export class BinError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'BinError';
  }
}
