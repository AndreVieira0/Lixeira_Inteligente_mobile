import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { betterAuth } from 'better-auth';
import { createApp } from '../src/app.js';
import { createSessionResolver } from '../src/auth.js';
import { createBinRepository } from '../src/bins.js';
import { migrate } from '../src/db/migrate.js';
import { assertRuntimeRole } from '../src/db/pool.js';

// The PowerShell harness creates and owns this cluster. Never fall back to DATABASE_URL.
const port = process.env.API_TEST_PORT;
if (!port || !/^\d+$/.test(port)) throw new Error('Run tests/run-integration.ps1 to create an isolated database');
const admin = new pg.Pool({ host: '127.0.0.1', port: Number(port), user: 'schema_test', database: 'postgres' });
const runtime = new pg.Pool({ host: '127.0.0.1', port: Number(port), user: 'api_test', database: 'postgres' });
const origin = 'http://localhost:8081';
const secret = 'integration-only-not-a-production-secret-123456789';
const authOptions = { database: admin, secret, baseURL: 'http://localhost:3000',
  trustedOrigins: [origin], emailAndPassword: { enabled: true }, logger: { disabled: true } };
let seedAuth: ReturnType<typeof betterAuth<typeof authOptions>>;
let app: ReturnType<typeof createApp>;
let cookieA: string;
let cookieB: string;
let ownerA: string;
let ownerB: string;
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const c = '00000000-0000-4000-8000-000000000003';
async function signup(email: string) {
  const response = await seedAuth.api.signUpEmail({ body: { name: 'Pessoa teste', email, password: 'test-password-12345' }, asResponse: true });
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie();
  const cookie = cookies.find((value) => value.startsWith('better-auth.session_token='))?.split(';')[0];
  assert.ok(cookie, 'SDK must issue the signed session cookie');
  const data = await response.json();
  return { cookie, id: data.user.id as string };
}
function request(path: string, cookie = cookieA, init: RequestInit = {}) {
  return app.request(path, { ...init, headers: { cookie, origin, ...init.headers } });
}
before(async () => {
  await migrate(admin);
  await admin.query('CREATE ROLE api_test LOGIN INHERIT; GRANT lixeira_api TO api_test');
  seedAuth = betterAuth(authOptions);
  const session = createSessionResolver(runtime, { secret, baseURL: 'http://localhost:3000', origins: [origin] });
  app = createApp({ origins: [origin, 'lixeira-inteligente://'], session, bins: createBinRepository(runtime) });
  ({ cookie: cookieA, id: ownerA } = await signup('a@example.test'));
  ({ cookie: cookieB, id: ownerB } = await signup('b@example.test'));
  await admin.query(`INSERT INTO app.bins (id, owner_id, device_id, name) VALUES
    ($1,$4,'BIN-A','Lixeira A'),($2,$5,'BIN-B','Lixeira B'),($3,$4,'BIN-C','Lixeira C')`, [a,b,c,ownerA,ownerB]);
});
after(async () => { await Promise.all([admin.end(), runtime.end()]); });

test('migrations are repeatable and checked, with restricted runtime access', async () => {
  assert.deepEqual(await migrate(admin), []);
  await assertRuntimeRole(runtime);
  await assert.rejects(assertRuntimeRole(admin));
  for (const sql of ['CREATE TABLE public.forbidden (id int)', 'CREATE TABLE app.forbidden (id int)',
    'CREATE SCHEMA forbidden', 'SELECT * FROM public.account', 'SELECT * FROM app.device_credentials',
    'SELECT * FROM app_meta.migrations', 'DELETE FROM app.bins', 'UPDATE app.bins SET owner_id = owner_id',
    'UPDATE app.bins SET disabled_at = now()', 'INSERT INTO app.measurements DEFAULT VALUES']) {
    await assert.rejects(runtime.query(sql), (error: unknown) => {
      assert.equal((error as { code: string }).code, '42501', sql); return true;
    });
  }
  await admin.query("UPDATE app_meta.migrations SET checksum = 'changed' WHERE name = '0001_auth.sql'");
  await assert.rejects(migrate(admin), /checksum/i);
  // Restore from the trusted file using the same SHA-256 representation.
  const { createHash } = await import('node:crypto');
  const { readFile } = await import('node:fs/promises');
  const file = (await readFile(new URL('../migrations/0001_auth.sql', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  await admin.query("UPDATE app_meta.migrations SET checksum=$1 WHERE name='0001_auth.sql'", [createHash('sha256').update(file, 'utf8').digest('hex')]);
});
test('signed SDK sessions authenticate; forged, expired and revoked cookies do not', async () => {
  assert.equal((await request('/v1/me')).status, 200);
  for (const cookie of ['better-auth.session_token=forged', cookieA + 'tampered', '']) {
    assert.equal((await request('/v1/me', cookie)).status, 401);
  }
  const expired = await signup('expired@example.test');
  await admin.query('UPDATE public.session SET "expiresAt"=now()-interval \'1 minute\' WHERE "userId"=$1', [expired.id]);
  assert.equal((await request('/v1/me', expired.cookie)).status, 401);
  const revoked = await signup('revoked@example.test');
  assert.equal((await request('/v1/me', revoked.cookie)).status, 200);
  await admin.query('DELETE FROM public.session WHERE "userId"=$1', [revoked.id]);
  assert.equal((await request('/v1/me', revoked.cookie)).status, 401);
});
test('startup refuses accidentally expanded sensitive runtime permissions', async () => {
  for (const privilege of [
    'SELECT ON public.account', 'UPDATE (email) ON public."user"',
    'INSERT ON app.measurements', 'UPDATE (disabled_at) ON app.bins',
  ]) {
    await admin.query(`GRANT ${privilege} TO api_test`);
    try { await assert.rejects(assertRuntimeRole(runtime), privilege); }
    finally { await admin.query(`REVOKE ${privilege} FROM api_test`); }
  }
  await assertRuntimeRole(runtime);
});
test('lists are isolated and paginated; missing readings remain null', async () => {
  const first = await (await request('/v1/bins?limit=1')).json();
  assert.deepEqual(first.items.map((bin: { id: string }) => bin.id), [a]);
  assert.equal(first.nextCursor, a);
  assert.equal(first.items[0].levelPercent, null);
  assert.equal(first.items[0].batteryPercent, null);
  const second = await (await request(`/v1/bins?limit=1&after=${first.nextCursor}`)).json();
  assert.deepEqual(second.items.map((bin: { id: string }) => bin.id), [c]);
  assert.equal(second.nextCursor, null);
  const other = await (await request('/v1/bins', cookieB)).json();
  assert.deepEqual(other.items.map((bin: { id: string }) => bin.id), [b]);
  const empty = await signup('empty@example.test');
  assert.deepEqual(await (await request('/v1/bins', empty.cookie)).json(), { items: [], nextCursor: null });
});
test('details hide foreign and nonexistent IDs with the same 404 contract', async () => {
  assert.equal((await request(`/v1/bins/${a}`)).status, 200);
  for (const id of [b, '00000000-0000-4000-8000-000000000099']) {
    const res = await request(`/v1/bins/${id}`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  }
});
test('PATCH persists normalized fields, preserves identity and cannot modify another account', async () => {
  const patch = (id: string, data: unknown, cookie = cookieA) => request(`/v1/bins/${id}`, cookie, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  assert.equal((await patch(b, { name: 'Invadida' })).status, 404);
  assert.equal((await patch(a, { ownerId: ownerB, name: 'Troca' })).status, 400);
  assert.equal((await patch(a, { name: '  Nova   lixeira  ', location: '  Bloco   A ' })).status, 200);
  let row = (await admin.query('SELECT * FROM app.bins WHERE id=$1', [a])).rows[0];
  assert.equal(row.name, 'Nova lixeira'); assert.equal(row.location, 'Bloco A');
  assert.equal(row.owner_id, ownerA); assert.equal(row.device_id, 'BIN-A');
  assert.equal((await patch(a, { location: '   ' })).status, 200);
  row = (await admin.query('SELECT * FROM app.bins WHERE id=$1', [a])).rows[0];
  assert.equal(row.location, null); assert.equal(row.name, 'Nova lixeira');
  assert.equal((await (await request(`/v1/bins/${b}`, cookieB)).json()).name, 'Lixeira B');
  const native = await app.request(`/v1/bins/${a}`, { method: 'PATCH', headers: {
    cookie: cookieA, origin: 'lixeira-inteligente://', 'content-type': 'application/json' }, body: '{"location":null}' });
  assert.equal(native.status, 200);
});
test('telemetry is numeric, timestamps are UTC, and older events do not replace current reading', async () => {
  await admin.query(`INSERT INTO app.measurements (bin_id,event_id,level_percent,battery_percent,measured_at,received_at)
    VALUES ($1,gen_random_uuid(),82.5,NULL,'2026-01-02T12:00:00Z','2026-01-02T12:00:01Z'),
    ($1,gen_random_uuid(),20,50,'2026-01-01T12:00:00Z','2026-01-03T12:00:00Z')`, [a]);
  const data = await (await request(`/v1/bins/${a}`)).json();
  assert.equal(data.levelPercent, 82.5); assert.equal(data.batteryPercent, null);
  assert.equal(data.measuredAt, '2026-01-02T12:00:00.000Z');
  assert.equal(data.lastSeenAt, '2026-01-03T12:00:00.000Z');
  assert.equal('ownerId' in data, false); assert.equal('secretHash' in data, false);
});
test('real session database outage returns 503 instead of logging secrets or 401', async () => {
  const dead = new pg.Pool({ host: '127.0.0.1', port: Number(port), user: 'nonexistent_role', database: 'postgres' });
  try {
    const failing = createApp({ origins: [origin], bins: createBinRepository(dead),
      session: createSessionResolver(dead, { secret, baseURL: 'http://localhost:3000', origins: [origin] }) });
    const res = await failing.request('/v1/me', { headers: { cookie: cookieA } });
    assert.equal(res.status, 503);
    assert.doesNotMatch(await res.text(), /nonexistent_role|postgres|password|token/);
  } finally { await dead.end(); }
});
test('migration SQL and version record roll back together and concurrent runners serialize', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lixeira-migration-tests-'));
  await admin.query('CREATE DATABASE migration_test');
  const pool = new pg.Pool({ host: '127.0.0.1', port: Number(port), user: 'schema_test', database: 'migration_test' });
  try {
    await writeFile(join(dir, '0001_test.sql'), 'BEGIN; CREATE TABLE marker(id integer); SELECT 1/0; COMMIT;');
    await assert.rejects(migrate(pool, dir));
    assert.equal((await pool.query("SELECT to_regclass('marker') AS name")).rows[0].name, null);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM app_meta.migrations')).rows[0].n, 0);
    await writeFile(join(dir, '0001_test.sql'), 'BEGIN; CREATE TABLE marker(id integer); SELECT pg_sleep(0.1); COMMIT;');
    const results = await Promise.all([migrate(pool, dir), migrate(pool, dir)]);
    assert.equal(results.flat().length, 1);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM app_meta.migrations')).rows[0].n, 1);
    await writeFile(join(dir, '0002_bad.sql'), 'BEGIN; CREATE TABLE should_rollback(id integer); SELECT 1/0; COMMIT;');
    await assert.rejects(migrate(pool, dir));
    assert.equal((await pool.query("SELECT to_regclass('should_rollback') AS name")).rows[0].name, null);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM app_meta.migrations')).rows[0].n, 1);
  } finally { await pool.end(); }
});
test('runner refuses to silently adopt a manually migrated database', async () => {
  await admin.query('CREATE DATABASE legacy_test');
  const pool = new pg.Pool({ host: '127.0.0.1', port: Number(port), user: 'schema_test', database: 'legacy_test' });
  try {
    await pool.query('CREATE TABLE public."user"(id text)');
    await assert.rejects(migrate(pool), /manual|baseline/i);
    assert.equal((await pool.query("SELECT to_regclass('app_meta.migrations') AS name")).rows[0].name, null);
  } finally { await pool.end(); }
});
test('migration checksum survives LF/CRLF checkouts but still detects SQL changes', async () => {
  await admin.query('CREATE DATABASE newline_test');
  const pool = new pg.Pool({ host: '127.0.0.1', port: Number(port), user: 'schema_test', database: 'newline_test' });
  const dir = await mkdtemp(join(tmpdir(), 'lixeira-newline-tests-'));
  const path = join(dir, '0001_test.sql');
  const sql = 'BEGIN;\nCREATE TABLE line_endings(id integer);\nCOMMIT;\n';
  try {
    await writeFile(path, sql.replaceAll('\n', '\r\n'));
    assert.deepEqual(await migrate(pool, dir), ['0001_test.sql']);
    await writeFile(path, sql);
    assert.deepEqual(await migrate(pool, dir), []);
    await writeFile(path, sql.replace('integer', 'text'));
    await assert.rejects(migrate(pool, dir), /checksum/i);
  } finally { await pool.end(); }
});
