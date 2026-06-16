import { db, schema } from '../lib/db'
import { createDataProvider, isSportmonksMode } from '../providers'
import { ingestFixtures } from './sportmonks-ingest'

/**
 * Reconcile the upstream fixture list with the database. In sportmonks mode it upserts
 * real fixtures/teams/referees; in mock mode the seed already holds the Copa 2026
 * fixtures, so this just reports the reconciliation (behaviour unchanged without a token).
 */
export async function runFixturesSync(): Promise<Record<string, unknown>> {
  const provider = createDataProvider()
  if (isSportmonksMode()) return ingestFixtures(provider)

  const upstream = await provider.fetchTodayMatches()
  const stored = await db.select({ id: schema.matches.id }).from(schema.matches)
  return { provider: provider.name, fixturesUpstream: upstream.length, matchesInDb: stored.length }
}
