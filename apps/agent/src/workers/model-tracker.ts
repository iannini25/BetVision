import { isNotNull } from 'drizzle-orm'
import { round3 } from '@betv/shared'
import { db, schema } from '../lib/db'

/**
 * Tracks calibration: averages the Brier score across resolved predictions.
 * Powers the public "nossos acertos e erros" transparency on the Modelo page.
 */
export async function runModelTracker(): Promise<Record<string, unknown>> {
  const resolved = await db
    .select({ brier: schema.predictionsLog.brierScore })
    .from(schema.predictionsLog)
    .where(isNotNull(schema.predictionsLog.brierScore))

  const avgBrier = resolved.length
    ? resolved.reduce((sum, r) => sum + (r.brier ?? 0), 0) / resolved.length
    : 0

  return { predictions: resolved.length, avgBrier: round3(avgBrier) }
}
