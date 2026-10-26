export function localHost(host: string) { return ['localhost', '127.0.0.1', '[::1]'].includes(host); }
export function databaseUrl(value: string | undefined, name = 'DATABASE_URL'): string {
  try {
    const url = new URL(value ?? '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error();
    // pg query parameters can override URL host/user/database and SSL settings.
    // Keep the effective destination identical to the authority validated here.
    for (const key of url.searchParams.keys()) {
      if (!['sslmode', 'channel_binding'].includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error();
    }
    if (url.searchParams.has('sslmode') && !['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode')!)) throw new Error();
    if (!localHost(url.hostname) && ['disable', 'allow', 'prefer', 'no-verify'].includes(url.searchParams.get('sslmode') ?? '')) throw new Error();
    return value!;
  } catch { throw new Error(`${name} deve conter uma URL PostgreSQL válida com TLS para conexão remota.`); }
}
export function readConfig(env: Record<string, string | undefined>) {
  const connectionString = databaseUrl(env.DATABASE_URL);
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.trim().length < 32) throw new Error('BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres aleatórios.');
  const baseURL = env.BETTER_AUTH_URL ?? '';
  try {
    const url = new URL(baseURL);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== baseURL ||
      (url.protocol === 'http:' && (env.NODE_ENV === 'production' || !localHost(url.hostname)))) throw new Error();
  } catch { throw new Error('BETTER_AUTH_URL deve ser uma origem HTTPS (HTTP somente em desenvolvimento local).'); }
  const origins = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
  for (const origin of origins) {
    if (/^[a-z][a-z0-9+.-]*:\/\/$/.test(origin) && !/^(https?|file|javascript|data):/.test(origin)) continue;
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || origin !== url.origin ||
        (url.protocol === 'http:' && (env.NODE_ENV === 'production' || !localHost(url.hostname)))) throw new Error();
    } catch { throw new Error('ALLOWED_ORIGINS deve listar origens exatas, sem caminhos ou curingas.'); }
  }
  const rawPort = env.PORT ?? '3000';
  if (!/^[1-9]\d*$/.test(rawPort) || Number(rawPort) > 65535) throw new Error('PORT deve estar entre 1 e 65535.');
  return { connectionString, secret, baseURL, origins, port: Number(rawPort) };
}
