import type { FirebaseApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function initializePersistentAuth(app: FirebaseApp): Auth {
  // getReactNativePersistence persists the session across app restarts via AsyncStorage.
  // The type declaration in types/firebase-native.d.ts covers the missing public export.
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
