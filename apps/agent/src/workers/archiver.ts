import { and, eq, lt } from 'drizzle-orm'
import { db, schema, pool } from '../lib/db'

const ARCHIVE_AFTER_MS = 48 * 60 * 60 * 1000
const FLAG_TTL_MS = 60 * 60 * 1000
const SNAPSHOT_TTL_MS = 30 * 60 * 1000

/**
 * Housekeeping: archive matches finished over 48h ago, retire stale value flags,
 * and prune old odds snapshots so the append-only table stays bounded.
 */
export async function runArchiver(): Promise<Record<string, unknown>> {
  const now = Date.now()

  const archived = await db
    .update(schema.matches)
    .set({ archived: true })
    .where(and(eq(schema.matches.status, 'finished'), lt(schema.matches.atualizadoEm, new Date(now - ARCHIVE_AFTER_MS))))
    .returning({ id: schema.matches.id })

  const retiredFlags = await db
    .update(schema.valueFlags)
    .set({ active: false })
    .where(and(eq(schema.valueFlags.active, true), lt(schema.valueFlags.criadoEm, new Date(now - FLAG_TTL_MS))))
    .returning({ id: schema.valueFlags.id })

  const pruned = await pool.query(
    `DELETE FROM odds_snapshots WHERE captured_at < $1`,
    [new Date(now - SNAPSHOT_TTL_MS)]
  )

  return { archived: archived.length, retiredFlags: retiredFlags.length, prunedSnapshots: pruned.rowCount ?? 0 }
}
