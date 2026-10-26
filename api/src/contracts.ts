export interface Profile { id: string; name: string; email: string; emailVerified: boolean }
export interface Bin {
  id: string; deviceId: string; name: string; location: string | null;
  disabledAt: string | null; levelPercent: number | null; batteryPercent: number | null;
  measuredAt: string | null; receivedAt: string | null; lastSeenAt: string | null;
}
export interface BinPatch { name?: string; location?: string | null }
export interface BinRepository {
  list(ownerId: string, limit: number, after?: string): Promise<{ items: Bin[]; nextCursor: string | null }>;
  get(ownerId: string, id: string): Promise<Bin | null>;
  update(ownerId: string, id: string, patch: BinPatch): Promise<Bin | null>;
}
export type SessionResolver = (headers: Headers) => Promise<Profile | null>;
