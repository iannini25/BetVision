import { runFixturesSync } from './fixtures-sync'
import { runPrematch } from './prematch'
import { runLiveEngine } from './live-engine'
import { runOddsSync } from './odds-sync'
import { runNewsWatcher } from './news-watcher'
import { runRagIndexer } from './rag-indexer'
import { runModelTracker } from './model-tracker'
import { runArchiver } from './archiver'

export type WorkerHandler = () => Promise<Record<string, unknown>>
export type WorkerDef = { name: string; cron: string; handler: WorkerHandler }

/**
 * Demo cadences (6-field cron, with seconds) — deliberately faster than the
 * production schedule in the master doc (PARTE G) so the dashboard visibly moves
 * with no API keys. Tune these down for production.
 */
export const WORKERS: WorkerDef[] = [
  { name: 'live-engine', cron: '*/5 * * * * *', handler: runLiveEngine },
  { name: 'odds-sync', cron: '*/20 * * * * *', handler: runOddsSync },
  { name: 'prematch', cron: '*/30 * * * * *', handler: runPrematch },
  { name: 'news-watcher', cron: '*/45 * * * * *', handler: runNewsWatcher },
  { name: 'rag-indexer', cron: '0 * * * * *', handler: runRagIndexer },
  { name: 'fixtures-sync', cron: '0 */2 * * * *', handler: runFixturesSync },
  { name: 'model-tracker', cron: '0 */2 * * * *', handler: runModelTracker },
  { name: 'archiver', cron: '30 */2 * * * *', handler: runArchiver },
]
