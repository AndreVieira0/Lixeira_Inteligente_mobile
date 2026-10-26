import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { BinRepository, Profile, SessionResolver } from './contracts.js';
import { ApiError, databaseOperation, notFound } from './errors.js';
import { binPatch, pagination, uuid } from './validation.js';

interface Dependencies {
  origins: string[]; bins: BinRepository; session: SessionResolver;
  reportError?: (event: { requestId: string; code: string }) => void;
}
export function createApp({ origins, bins, session, reportError }: Dependencies) {
  const app = new Hono<{ Variables: { requestId: string; profile: Profile } }>();
  app.use('*', async (c, next) => {
    const requestId = randomUUID();
    c.set('requestId', requestId);
    c.header('x-request-id', requestId);
    c.header('cache-control', 'no-store');
    c.header('x-content-type-options', 'nosniff');
    await next();
  });
  app.onError((error, c) => {
    const status = error instanceof ApiError ? error.status : 500;
    const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof ApiError ? error.message : 'Erro interno do serviço.';
    if (status >= 500) reportError?.({ requestId: c.get('requestId'), code });
    return c.json({ error: { code, message, requestId: c.get('requestId') } }, status);
  });
  app.notFound(() => { throw notFound(); });
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.use('/v1/*', async (c, next) => {
    const origin = c.req.header('origin');
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method);
    c.header('vary', 'Origin');
    if ((origin !== undefined && !origins.includes(origin)) || (mutation && !origin)) {
      throw new ApiError(403, 'ORIGIN_FORBIDDEN', 'Origem da requisição não permitida.');
    }
    if (origin) {
      c.header('access-control-allow-origin', origin);
      c.header('access-control-allow-credentials', 'true');
      c.header('access-control-expose-headers', 'x-request-id');
    }
    if (c.req.method === 'OPTIONS') {
      c.header('access-control-allow-methods', 'GET, HEAD, PATCH, OPTIONS');
      c.header('access-control-allow-headers', 'Content-Type');
      return c.body(null, 204);
    }
    const profile = await databaseOperation(() => session(c.req.raw.headers));
    if (!profile) throw new ApiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.');
    c.set('profile', profile);
    await next();
  });
  app.get('/v1/me', (c) => {
    const { id, name, email, emailVerified } = c.get('profile');
    return c.json({ id, name, email, emailVerified });
  });
  app.get('/v1/bins', async (c) => {
    const { limit, after } = pagination(c.req.url);
    return c.json(await databaseOperation(() => bins.list(c.get('profile').id, limit, after)));
  });
  app.get('/v1/bins/:id', async (c) => {
    const id = uuid(c.req.param('id'));
    const bin = await databaseOperation(() => bins.get(c.get('profile').id, id));
    if (!bin) throw notFound();
    return c.json(bin);
  });
  app.patch('/v1/bins/:id', async (c) => {
    const id = uuid(c.req.param('id'));
    const patch = await binPatch(c.req.raw);
    const bin = await databaseOperation(() => bins.update(c.get('profile').id, id, patch));
    if (!bin) throw notFound();
    return c.json(bin);
  });
  return app;
}
