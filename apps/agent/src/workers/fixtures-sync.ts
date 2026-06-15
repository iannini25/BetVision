import { db, schema } from '../lib/db'
import { createDataProvider } from '../providers'

/**
 * Reconcile the upstream fixture list with the database. In mock mode the seed
 * already holds the Copa 2026 fixtures, so this reports the reconciliation;
 * with a real DATA_PROVIDER the same call returns live fixtures to upsert.
 */
export async function runFixturesSync(): Promise<Record<string, unknown>> {
  const provider = createDataProvider()
  const upstream = await provider.fetchTodayMatches()
  const stored = await db.select({ id: schema.matches.id }).from(schema.matches)
  return { provider: provider.name, fixturesUpstream: upstream.length, matchesInDb: stored.length }
}
