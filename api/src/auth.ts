import { betterAuth } from 'better-auth';
import type pg from 'pg';
import type { SessionResolver } from './contracts.js';

export function createSessionResolver(pool: pg.Pool, config: { secret: string; baseURL: string; origins: string[] }): SessionResolver {
  const auth = betterAuth({ database: pool, secret: config.secret, baseURL: config.baseURL,
    trustedOrigins: config.origins, logger: { disabled: true },
    session: { cookieCache: { enabled: false }, disableSessionRefresh: true },
  });
  return async (headers) => {
    // SDK validates cookie signatures and queries the authoritative session store.
    // Do not convert database exceptions into a null (anonymous) session.
    const result = await auth.api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
    if (!result) return null;
    const { id, name, email, emailVerified } = result.user;
    return { id, name, email, emailVerified };
  };
}
