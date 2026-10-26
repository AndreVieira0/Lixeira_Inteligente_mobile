import { databaseUrl } from '../config.js';
import { createPool } from './pool.js';
import { migrate } from './migrate.js';

try {
  // Administrative URL is read exclusively by this explicit command, never server.ts.
  const pool = createPool(databaseUrl(process.env.MIGRATION_DATABASE_URL, 'MIGRATION_DATABASE_URL'));
  try {
    const files = await migrate(pool);
    console.log(files.length ? `Applied: ${files.join(', ')}` : 'Database is up to date.');
  } finally { await pool.end(); }
} catch {
  console.error('Migration failed. Check database permissions, migration history/checksums and SQL files. Credentials and SQL errors are not logged.');
  process.exitCode = 1;
}
