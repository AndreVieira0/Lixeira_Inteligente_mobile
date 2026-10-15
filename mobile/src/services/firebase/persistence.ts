import type { FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, initializeAuth, type Auth } from 'firebase/auth';

export function initializePersistentAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: browserLocalPersistence });
}
