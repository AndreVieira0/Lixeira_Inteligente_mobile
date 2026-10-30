import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

import type { AlertGateway, AlertSettings } from '../../types/alert';

const ALERT_DOC_ID = (binId: string, uid: string) => `${uid}_${binId}`;

function toAlert(id: string, data: Record<string, unknown>): AlertSettings {
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
}

export function createFirebaseAlertGateway(db: Firestore): AlertGateway {
  return {
    async listAlerts(uid) {
      const q = query(collection(db, 'alertSettings'), where('uid', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toAlert(d.id, d.data() as Record<string, unknown>));
    },

    async getAlert(binId, uid) {
      const ref = doc(db, 'alertSettings', ALERT_DOC_ID(binId, uid));
      const snap = await getDocFromServer(ref);
      if (!snap.exists()) return null;
      return toAlert(snap.id, snap.data() as Record<string, unknown>);
    },

    async saveAlert(binId, uid, thresholds, enabled) {
      const ref = doc(db, 'alertSettings', ALERT_DOC_ID(binId, uid));
      await setDoc(ref, {
        uid,
        binId,
        thresholds,
        enabled,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    },

    async deleteAlert(binId, uid) {
      await deleteDoc(doc(db, 'alertSettings', ALERT_DOC_ID(binId, uid)));
    },
  };
}
