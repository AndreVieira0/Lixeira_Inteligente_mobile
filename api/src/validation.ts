import type { BinPatch } from './contracts.js';
import { ApiError, invalid } from './errors.js';

export function uuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw invalid();
  return value.toLowerCase();
}
export function pagination(url: string) {
  const query = new URL(url).searchParams;
  for (const key of query.keys()) {
    if (!['limit', 'after'].includes(key) || query.getAll(key).length !== 1) throw invalid();
  }
  const raw = query.get('limit') ?? '50';
  if (!/^[1-9]\d*$/.test(raw) || Number(raw) > 100) throw invalid();
  const after = query.has('after') ? uuid(query.get('after')!) : undefined;
  return { limit: Number(raw), after };
}
export async function binPatch(request: Request): Promise<BinPatch> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envie um objeto JSON.');
  }
  // Count actual streamed bytes too; a supplied Content-Length is not trusted.
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Corpo da requisição excede o limite.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw invalid(); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid();
  const entries = Object.entries(body);
  if (!entries.length || entries.some(([key]) => !['name', 'location'].includes(key))) throw invalid();
  const patch: BinPatch = {};
  for (const [key, value] of entries) {
    if (key === 'location' && value === null) { patch.location = null; continue; }
    if (typeof value !== 'string') throw invalid();
    const normalized = value.trim().replace(/\s+/gu, ' ');
    const length = [...normalized].length;
    if (normalized.includes('\0') || length > (key === 'name' ? 80 : 100) || (key === 'name' && !length)) throw invalid();
    if (key === 'name') patch.name = normalized;
    else patch.location = normalized || null;
  }
  return patch;
}
