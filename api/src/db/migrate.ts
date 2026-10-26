import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type pg from 'pg';

const defaultDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url));
const lockId = '741802604';

// Existing migrations have their own transaction envelope. Remove only that
// envelope; the runner owns the transaction containing both SQL and checksum.
function transactionBody(sql: string) {
  const withoutComments = sql.replace(/^(?:\s|--[^\n]*(?:\n|$))*/, '');
  if (!/^BEGIN;/i.test(withoutComments) || !/COMMIT;\s*$/i.test(withoutComments)) {
    throw new Error('Migration must have an outer BEGIN/COMMIT envelope');
  }
  return withoutComments.replace(/^BEGIN;/i, '').replace(/COMMIT;\s*$/i, '');
}
export async function migrate(pool: pg.Pool, directory = defaultDirectory): Promise<string[]> {
  const files = (await readdir(directory)).filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (!files.length) throw new Error('No migration files found');
  const migrations = await Promise.all(files.map(async (name) => {
    const sql = (await readFile(join(directory, name), 'utf8')).replace(/\r\n/g, '\n');
    return { name, checksum: createHash('sha256').update(sql, 'utf8').digest('hex'), sql: transactionBody(sql) };
  }));
  const client = await pool.connect();
  let locked = false;
  let broken = false;
  try {
    await client.query("SET lock_timeout = '15s'");
    await client.query('SELECT pg_advisory_lock($1::bigint)', [lockId]);
    locked = true;
    const baseline = (await client.query(`SELECT to_regclass('app_meta.migrations') AS registry,
      to_regclass('public."user"') AS users, to_regnamespace('app') AS domain`)).rows[0];
    if (!baseline.registry && (baseline.users || baseline.domain)) {
      throw new Error('Manual baseline detected: review/adopt explicitly or use an empty database');
    }
    if (!baseline.registry) {
      await client.query(`BEGIN;
        CREATE SCHEMA app_meta;
        REVOKE ALL ON SCHEMA app_meta FROM PUBLIC;
        CREATE TABLE app_meta.migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());
        REVOKE ALL ON app_meta.migrations FROM PUBLIC;
        COMMIT;`);
    }
    const applied = (await client.query<{ name: string; checksum: string }>('SELECT name, checksum FROM app_meta.migrations ORDER BY name')).rows;
    // Applied files must be an exact prefix; never silently ignore missing files,
    // changed SQL, or a migration inserted before already-applied migrations.
    for (const [index, row] of applied.entries()) {
      const migration = migrations[index];
      if (!migration || row.name !== migration.name || row.checksum !== migration.checksum) {
        throw new Error('Migration order/checksum mismatch; review database history');
      }
    }
    const completed: string[] = [];
    for (const migration of migrations.slice(applied.length)) {
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO app_meta.migrations(name, checksum) VALUES ($1,$2)', [migration.name, migration.checksum]);
        await client.query('COMMIT');
        completed.push(migration.name);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return completed;
  } finally {
    try {
      // Also recover initialization failures before releasing a pooled connection.
      await client.query('ROLLBACK');
      if (locked) await client.query('SELECT pg_advisory_unlock($1::bigint)', [lockId]);
      await client.query('RESET lock_timeout');
    } catch { broken = true; }
    client.release(broken);
  }
}
