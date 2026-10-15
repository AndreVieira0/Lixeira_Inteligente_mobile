function environmentString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

// Expo replaces only direct EXPO_PUBLIC_* property access at bundle time.
export const firebaseConfig = {
  apiKey: environmentString(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: environmentString(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: environmentString(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: environmentString(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: environmentString(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: environmentString(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

export const firebaseConfigured = [firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId, firebaseConfig.appId]
  .every((value) => typeof value === 'string' && value.trim().length > 0);

export const emulatorHost = environmentString(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST);
export const useFirebaseEmulators = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// The current delivery is a navigable frontend preview. Backend access is opt-in.
export const demoMode = process.env.EXPO_PUBLIC_APP_MODE !== 'firebase';
