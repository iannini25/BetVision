import { pool } from '../lib/db'

/**
 * Stamp a worker's liveness into system_health (one row per worker, updated in place).
 * Uptime Kuma and the AgentStatus UI read from here.
 */
export async function recordHeartbeat(
  worker: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const json = JSON.stringify(metadata)
  const updated = await pool.query(
    `UPDATE system_health SET status = 'ok', last_heartbeat = now(), metadata = $2::jsonb WHERE worker = $1`,
    [worker, json]
  )
  if (updated.rowCount === 0) {
    await pool.query(
      `INSERT INTO system_health (worker, status, last_heartbeat, metadata) VALUES ($1, 'ok', now(), $2::jsonb)`,
      [worker, json]
    )
  }
}
