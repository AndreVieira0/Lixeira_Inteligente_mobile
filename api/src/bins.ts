import type pg from 'pg';
import type { Bin, BinRepository } from './contracts.js';

interface BinRow {
  bin_id: string; device_id: string; name: string; location: string | null;
  disabled_at: Date | null; level_percent: string | null; battery_percent: string | null;
  measured_at: Date | null; received_at: Date | null; last_seen_at: Date | null;
}
const fields = `s.bin_id, s.device_id, s.disabled_at, s.level_percent,
  s.battery_percent, s.measured_at, s.received_at, s.last_seen_at`;
function toBin(row: BinRow): Bin {
  return { id: row.bin_id, deviceId: row.device_id, name: row.name, location: row.location,
    disabledAt: row.disabled_at?.toISOString() ?? null,
    levelPercent: row.level_percent === null ? null : Number(row.level_percent),
    batteryPercent: row.battery_percent === null ? null : Number(row.battery_percent),
    measuredAt: row.measured_at?.toISOString() ?? null,
    receivedAt: row.received_at?.toISOString() ?? null,
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
  };
}
export function createBinRepository(pool: pg.Pool): BinRepository {
  return {
    async list(ownerId, limit, after) {
      const result = await pool.query<BinRow>(`SELECT ${fields}, s.name, s.location
        FROM app.bin_current_state s WHERE s.owner_id=$1 AND ($2::uuid IS NULL OR s.bin_id>$2)
        ORDER BY s.bin_id LIMIT $3`, [ownerId, after ?? null, limit + 1]);
      const items = result.rows.slice(0, limit).map(toBin);
      return { items, nextCursor: result.rows.length > limit ? items.at(-1)!.id : null };
    },
    async get(ownerId, id) {
      const result = await pool.query<BinRow>(`SELECT ${fields}, s.name, s.location
        FROM app.bin_current_state s WHERE s.owner_id=$1 AND s.bin_id=$2`, [ownerId, id]);
      return result.rows[0] ? toBin(result.rows[0]) : null;
    },
    async update(ownerId, id, patch) {
      // Ownership is part of the write predicate, not a separate pre-check.
      // The view uses the statement snapshot: use RETURNING for edited fields.
      const result = await pool.query<BinRow>(`WITH updated AS (
        UPDATE app.bins SET
          name=CASE WHEN $3::boolean THEN $4::text ELSE name END,
          location=CASE WHEN $5::boolean THEN $6::text ELSE location END
        WHERE owner_id=$1 AND id=$2 RETURNING id, name, location
      ) SELECT ${fields}, u.name, u.location FROM updated u
        JOIN app.bin_current_state s ON s.bin_id=u.id WHERE s.owner_id=$1`,
      [ownerId, id, patch.name !== undefined, patch.name ?? null,
        patch.location !== undefined, patch.location ?? null]);
      return result.rows[0] ? toBin(result.rows[0]) : null;
    },
  };
}
