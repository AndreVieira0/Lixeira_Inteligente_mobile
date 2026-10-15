import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import type { Identity, UserProfile } from '../../types/account';

import { getFirebaseClient } from './client';
import { parseProfile, toIdentity } from './gateway';

export function observeIdentity(next: (identity: Identity | null) => void, fail: (error: unknown) => void): () => void {
  const client = getFirebaseClient();
  if (!client) { next(null); return () => undefined; }
  return onAuthStateChanged(client.auth, (user) => { next(toIdentity(user)); }, fail);
}

export function observeProfile(uid: string, next: (profile: UserProfile | null) => void, fail: (error: unknown) => void): () => void {
  const client = getFirebaseClient();
  if (!client) return () => undefined;
  return onSnapshot(doc(client.db, 'users', uid), { includeMetadataChanges: true }, (snapshot) => {
    // An empty local cache is not evidence that the server profile is missing.
    if (snapshot.metadata.fromCache && !snapshot.exists()) return;
    try { next(snapshot.exists() ? parseProfile(uid, snapshot.data()) : null); }
    catch (error) { fail(error); }
  }, fail);
}
