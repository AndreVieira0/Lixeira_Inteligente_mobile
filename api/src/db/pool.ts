import pg from 'pg';
import { databaseUrl, localHost } from '../config.js';

export function createPool(connectionString: string, reportError: () => void = () => {}) {
  const url = new URL(databaseUrl(connectionString));
  const remote = !localHost(url.hostname);
  // Never allow URL sslmode=require/no-verify to weaken certificate verification.
  if (remote) for (const key of ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  const pool = new pg.Pool({ connectionString: url.toString(), max: 5,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    statement_timeout: 10000, query_timeout: 12000,
    ...(remote ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  pool.on('error', () => reportError());
  return pool;
}
export async function assertRuntimeRole(pool: pg.Pool): Promise<void> {
  const result = await pool.query<{ unsafe: boolean }>(`SELECT (
    r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
    OR EXISTS (SELECT 1 FROM pg_roles parent WHERE pg_has_role(current_user,parent.oid,'MEMBER')
      AND (parent.rolsuper OR parent.rolcreatedb OR parent.rolcreaterole OR parent.rolreplication OR parent.rolbypassrls))
    OR has_database_privilege(current_user, current_database(), 'CREATE')
    OR EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('public','app','app_meta')
      AND (pg_has_role(current_user,n.nspowner,'USAGE') OR has_schema_privilege(current_user,n.oid,'CREATE')))
    OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','app','app_meta') AND pg_has_role(current_user,c.relowner,'USAGE'))
    OR EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','app','app_meta') AND c.relkind IN ('r','p','v','m','f') AND (
        (NOT ((n.nspname='public' AND c.relname IN ('user','session'))
          OR (n.nspname='app' AND c.relname IN ('bins','bin_current_state')))
          AND has_any_column_privilege(current_user,c.oid,'SELECT'))
        OR has_table_privilege(current_user,c.oid,'INSERT,TRUNCATE,TRIGGER,REFERENCES')
        OR has_any_column_privilege(current_user,c.oid,'INSERT,REFERENCES')
        OR (NOT (n.nspname='public' AND c.relname='session') AND has_table_privilege(current_user,c.oid,'DELETE'))
        OR EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
          AND NOT (n.nspname='app' AND c.relname='bins' AND a.attname IN ('name','location'))
          AND has_column_privilege(current_user,c.oid,a.attnum,'UPDATE'))
      )
    )
    OR NOT pg_has_role(current_user,'lixeira_api','USAGE')
  ) AS unsafe FROM pg_roles r WHERE r.rolname=current_user`);
  if (result.rows[0]?.unsafe !== false) throw new Error('API requires a restricted runtime role, not the migration/schema owner');
}
