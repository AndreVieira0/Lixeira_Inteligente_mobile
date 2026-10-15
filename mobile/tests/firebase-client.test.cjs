const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getApps, deleteApp } = require('firebase/app');

test('configuração inválida de emulador nunca inicializa serviços, mesmo após nova tentativa', async () => {
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'public-test-key';
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'real-project.firebaseapp.com';
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'real-project';
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'public-test-app';
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS = 'true';
  process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST = '127.0.0.1';
  global.__DEV__ = true;
  const { getFirebaseClient } = require('../src/services/firebase/client.ts');
  try {
    assert.throws(() => getFirebaseClient(), /Emuladores/);
    assert.throws(() => getFirebaseClient(), /Emuladores/);
    assert.equal(getApps().length, 0);
  } finally {
    await Promise.all(getApps().map(deleteApp));
  }
});
