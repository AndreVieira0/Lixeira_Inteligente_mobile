const { spawn } = require('node:child_process');
const path = require('node:path');

// This server is exclusively for E2E tests. Explicit demo settings prevent cloud access.
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--web', '--offline', '--port', '8081'], {
  cwd: path.resolve(__dirname, '../..'),
  stdio: 'inherit',
  windowsHide: true,
  env: {
    ...process.env,
    CI: '1',
    EXPO_PUBLIC_APP_MODE: 'firebase',
    EXPO_PUBLIC_ENVIRONMENT: 'test',
    EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-lixeira-inteligente.firebaseapp.com',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-lixeira-inteligente',
    EXPO_PUBLIC_FIREBASE_APP_ID: 'demo-app-id',
    EXPO_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
    EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '127.0.0.1',
  },
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(signal); });
