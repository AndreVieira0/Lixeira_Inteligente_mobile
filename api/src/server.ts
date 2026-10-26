import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createSessionResolver } from './auth.js';
import { createBinRepository } from './bins.js';
import { readConfig } from './config.js';
import { assertRuntimeRole, createPool } from './db/pool.js';

async function start() {
  const config = readConfig(process.env);
  const pool = createPool(config.connectionString, () => console.error(JSON.stringify({ code: 'DATABASE_CONNECTION_ERROR' })));
  try {
    await assertRuntimeRole(pool);
    const app = createApp({ origins: config.origins, bins: createBinRepository(pool),
      session: createSessionResolver(pool, config),
      reportError: (event) => console.error(JSON.stringify(event)),
    });
    const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, () => console.log(`API listening on port ${config.port}`));
    let closing = false;
    const shutdown = () => {
      if (closing) return;
      closing = true;
      server.close(() => { void pool.end(); });
      setTimeout(() => {
        if ('closeAllConnections' in server) server.closeAllConnections();
      }, 10000).unref();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) { await pool.end(); throw error; }
}
start().catch(() => {
  console.error('API startup failed. Check required environment, database connectivity and restricted runtime role.');
  process.exitCode = 1;
});
