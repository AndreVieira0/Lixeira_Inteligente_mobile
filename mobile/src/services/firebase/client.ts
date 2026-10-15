import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { emulatorHost, firebaseConfig, firebaseConfigured, useFirebaseEmulators } from '../../config/environment';
import { AccountService } from '../accountService';

import { createFirebaseGateway } from './gateway';
import { initializePersistentAuth } from './persistence';

interface FirebaseClient { auth: Auth; db: Firestore; accounts: AccountService }
const APP_NAME = 'lixeira-inteligente-mobile';
// Preserve the fully initialized client across Fast Refresh; never reuse partial setup.
const runtime = globalThis as typeof globalThis & {
  __lixeiraFirebase?: { configKey: string; client: FirebaseClient };
};

export function getFirebaseClient(): FirebaseClient | null {
  if (!firebaseConfigured) return null;
  if (useFirebaseEmulators && (!__DEV__ || !firebaseConfig.projectId?.startsWith('demo-') || !emulatorHost)) {
    throw new Error('Emuladores exigem desenvolvimento, projeto demo-* e host explícito.');
  }
  const configKey = JSON.stringify([firebaseConfig, useFirebaseEmulators, emulatorHost]);
  if (runtime.__lixeiraFirebase) {
    if (runtime.__lixeiraFirebase.configKey !== configKey) throw new Error('Reinicie o aplicativo após alterar o ambiente Firebase.');
    return runtime.__lixeiraFirebase.client;
  }
  if (getApps().some((app) => app.name === APP_NAME)) {
    throw new Error('Inicialização incompleta do Firebase. Reinicie o aplicativo.');
  }
  const app = initializeApp(firebaseConfig, APP_NAME);
  const auth = initializePersistentAuth(app);
  auth.languageCode = 'pt-BR';
  const db = getFirestore(app);
  if (useFirebaseEmulators && emulatorHost) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
  }
  const client = { auth, db, accounts: new AccountService(createFirebaseGateway(auth, db)) };
  runtime.__lixeiraFirebase = { configKey, client };
  return client;
}
