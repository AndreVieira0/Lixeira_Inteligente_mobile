import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';

const origin = 'http://localhost:8081';
const id = '00000000-0000-4000-8000-000000000001';
// Database failures are injected only at the I/O boundary; authorization is
// exercised against PostgreSQL and signed cookies in integration.test.ts.
const unavailable = async (): Promise<never> => { throw new Error('password=secret SQL SELECT token'); };
const bins = { list: unavailable, get: unavailable, update: unavailable };
const app = createApp({ origins: [origin, 'lixeira-inteligente://'], bins, session: async () => null });
const authenticated = createApp({ origins: [origin], bins,
  session: async () => ({ id: 'account-a', name: 'Ana', email: 'ana@example.test', emailVerified: true }) });

test('health works without database or authentication', async () => {
  const res = await app.request('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});
test('private routes require session and return traceable, non-cacheable errors', async () => {
  for (const path of ['/v1/me', '/v1/bins', `/v1/bins/${id}`]) {
    const res = await app.request(path);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    assert.equal(body.error.requestId, res.headers.get('x-request-id'));
    assert.equal(res.headers.get('cache-control'), 'no-store');
  }
});
test('session storage failure is 503, not anonymous or a leaked exception', async () => {
  const failing = createApp({ origins: [origin], bins, session: unavailable });
  const res = await failing.request('/v1/me');
  assert.equal(res.status, 503);
  assert.doesNotMatch(await res.text(), /password|secret|SQL|token/);
});
test('me exposes only public profile fields', async () => {
  const res = await authenticated.request('/v1/me');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: 'account-a', name: 'Ana', email: 'ana@example.test', emailVerified: true });
});
test('unknown auth endpoints stay unmounted', async () => {
  const res = await app.request('/api/auth/sign-up/email', { method: 'POST' });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});
test('CORS allows exact configured origins with credentials, not lookalikes', async () => {
  const ok = await app.request('/v1/me', { method: 'OPTIONS', headers: {
    origin, 'access-control-request-method': 'PATCH', 'access-control-request-headers': 'content-type' } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), origin);
  assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
  for (const bad of ['null', 'https://evil.test', `${origin}.evil.test`]) {
    const res = await app.request('/v1/me', { headers: { origin: bad } });
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
});
test('mutations reject missing or foreign origin before database access', async () => {
  for (const headers of [{} as Record<string, string>, { origin: 'https://evil.test' }]) {
    const res = await authenticated.request(`/v1/bins/${id}`, { method: 'PATCH', headers });
    assert.equal(res.status, 403);
  }
});
test('invalid IDs and pagination never reach the database', async () => {
  for (const path of ['/v1/bins/not-uuid', '/v1/bins?limit=0', '/v1/bins?limit=101',
    '/v1/bins?limit=1.5', '/v1/bins?limit=1&limit=2', '/v1/bins?after=invalid', '/v1/bins?ownerId=other']) {
    assert.equal((await authenticated.request(path)).status, 400, path);
  }
});
test('PATCH rejects unsafe, empty, oversized and malformed payloads', async () => {
  for (const body of ['{', 'null', '[]', '{}', '{"name":1}', '{"name":"  "}',
    '{"ownerId":"other"}', '{"deviceId":"BIN-X"}', '{"name":"ok","extra":true}',
    JSON.stringify({ name: 'a'.repeat(81) }), JSON.stringify({ location: 'a'.repeat(101) })]) {
    const res = await authenticated.request(`/v1/bins/${id}`, {
      method: 'PATCH', headers: { origin, 'content-type': 'application/json' }, body });
    assert.equal(res.status, 400, body);
  }
  const large = await authenticated.request(`/v1/bins/${id}`, { method: 'PATCH',
    headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(9000) }) });
  assert.equal(large.status, 413);
  const wrongType = await authenticated.request(`/v1/bins/${id}`, { method: 'PATCH', headers: { origin }, body: 'name=a' });
  assert.equal(wrongType.status, 415);
});
test('query database failure has a safe 503 envelope', async () => {
  const res = await authenticated.request('/v1/bins');
  assert.equal(res.status, 503);
  assert.doesNotMatch(await res.text(), /password|secret|SQL|token/);
});

const env = { DATABASE_URL: 'postgres://api:local@localhost/test', BETTER_AUTH_SECRET: 'a'.repeat(40),
  BETTER_AUTH_URL: 'http://localhost:3000', ALLOWED_ORIGINS: `${origin},lixeira-inteligente://` };
test('configuration requires secrets, exact origins and valid port without leaking values', () => {
  assert.equal(readConfig(env).port, 3000);
  for (const change of [{ DATABASE_URL: '' }, { DATABASE_URL: 'https://db.test' },
    { BETTER_AUTH_SECRET: 'short' }, { ALLOWED_ORIGINS: '*' }, { ALLOWED_ORIGINS: 'null' },
    { ALLOWED_ORIGINS: 'https://example.test/path' }, { PORT: 'NaN' }, { PORT: '65536' },
    { NODE_ENV: 'production', BETTER_AUTH_URL: 'http://example.test' }]) {
    assert.throws(() => readConfig({ ...env, ...change }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /postgres:\/\/|a{40}/);
      return true;
    });
  }
});
test('database URL cannot disguise a remote host as local to bypass TLS', () => {
  for (const url of [
    'postgresql://runtime@localhost/test?host=db.example.test&sslmode=disable',
    'postgresql://runtime@localhost/test?hostaddr=203.0.113.1',
    'postgresql://runtime@localhost/test?ssl=false',
  ]) assert.throws(() => readConfig({ ...env, DATABASE_URL: url }));
});
