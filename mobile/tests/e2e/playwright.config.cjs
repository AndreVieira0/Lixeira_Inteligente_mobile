const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '*.spec.cjs',
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: '../../test-results',
  use: {
    baseURL: 'http://127.0.0.1:8081',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tests/e2e/start-web.cjs',
    cwd: require('node:path').resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:8081',
    timeout: 180000,
    reuseExistingServer: false,
  },
});
