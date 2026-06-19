import { createDataProvider } from '../providers'
import { ingestLive } from './sportmonks-ingest'

/**
 * Production live worker: polls the provider's livescores and refreshes the known
 * matches (score/events/stats/status), firing pg_notify -> realtime. Replaces the mock
 * live-engine simulator in the production cadence profile; only registered in sportmonks mode.
 */
export async function runLiveSync(): Promise<Record<string, unknown>> {
  return ingestLive(createDataProvider())
}
