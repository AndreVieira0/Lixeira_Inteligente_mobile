const { spawn } = require('node:child_process');
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--web', '--offline', '--port', '8082'], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, CI: '1', EXPO_PUBLIC_APP_MODE: 'demo' },
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(signal); });
