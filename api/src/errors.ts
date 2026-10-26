export class ApiError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 404 | 413 | 415 | 503,
    public readonly code: string, message: string) { super(message); }
}
export const invalid = () => new ApiError(400, 'INVALID_INPUT', 'Dados de entrada inválidos.');
export const unavailable = () => new ApiError(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.');
export const notFound = () => new ApiError(404, 'NOT_FOUND', 'Recurso não encontrado.');
export async function databaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch { throw unavailable(); }
}
