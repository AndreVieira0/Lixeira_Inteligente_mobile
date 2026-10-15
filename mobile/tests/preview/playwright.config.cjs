const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '*.spec.cjs',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  outputDir: '../../test-results/preview',
  use: { baseURL: 'http://127.0.0.1:8082', browserName: 'chromium', channel: 'chrome', screenshot: 'only-on-failure' },
  webServer: {
    command: 'node tests/preview/start-web.cjs',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:8082',
    timeout: 180000,
    reuseExistingServer: false,
  },
});
