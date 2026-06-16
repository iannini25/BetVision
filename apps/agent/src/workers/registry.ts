import { runFixturesSync } from './fixtures-sync'
import { runPrematch } from './prematch'
import { runLiveEngine } from './live-engine'
import { runLiveSync } from './live-sync'
import { runProbabilities } from './probabilities-sync'
import { runOddsSync } from './odds-sync'
import { runNewsWatcher } from './news-watcher'
import { runRagIndexer } from './rag-indexer'
import { runModelTracker } from './model-tracker'
import { runArchiver } from './archiver'
import { isSportmonksMode } from '../providers'

export type WorkerHandler = () => Promise<Record<string, unknown>>
export type WorkerDef = { name: string; cron: string; handler: WorkerHandler }

/**
 * Demo cadence (6-field cron, with seconds) — deliberately faster than production so
 * the dashboard visibly moves with no API keys, driven by the mock live-engine simulator.
 */
const DEMO: WorkerDef[] = [
  { name: 'live-engine', cron: '*/5 * * * * *', handler: runLiveEngine },
  { name: 'odds-sync', cron: '*/20 * * * * *', handler: runOddsSync },
  { name: 'prematch', cron: '*/30 * * * * *', handler: runPrematch },
  { name: 'news-watcher', cron: '*/45 * * * * *', handler: runNewsWatcher },
  { name: 'rag-indexer', cron: '0 * * * * *', handler: runRagIndexer },
  { name: 'fixtures-sync', cron: '0 */2 * * * *', handler: runFixturesSync },
  { name: 'model-tracker', cron: '0 */2 * * * *', handler: runModelTracker },
  { name: 'archiver', cron: '30 */2 * * * *', handler: runArchiver },
]

/**
 * Production cadence (PARTE G of the master doc) — real Sportmonks data, polled at
 * sustainable intervals, with live-sync (real livescores) instead of the simulator.
 */
const PROD: WorkerDef[] = [
  { name: 'live-sync', cron: '*/20 * * * * *', handler: runLiveSync },
  // Recompute model probabilities each minute so odds-sync (every 2 min) always has
  // fresh model numbers to pair real odds against for value flags.
  { name: 'probabilities', cron: '0 * * * * *', handler: runProbabilities },
  { name: 'odds-sync', cron: '0 */2 * * * *', handler: runOddsSync },
  { name: 'prematch', cron: '0 */10 * * * *', handler: runPrematch },
  { name: 'news-watcher', cron: '0 */10 * * * *', handler: runNewsWatcher },
  { name: 'rag-indexer', cron: '0 * * * * *', handler: runRagIndexer },
  { name: 'fixtures-sync', cron: '0 0 */6 * * *', handler: runFixturesSync },
  { name: 'model-tracker', cron: '0 */5 * * * *', handler: runModelTracker },
  { name: 'archiver', cron: '0 0 * * * *', handler: runArchiver },
]

/** Explicit WORKER_PROFILE wins; otherwise prod when real Sportmonks is active, else demo. */
export function activeProfile(): 'demo' | 'prod' {
  const profile = process.env.WORKER_PROFILE
  if (profile === 'demo' || profile === 'prod') return profile
  return isSportmonksMode() ? 'prod' : 'demo'
}

export const WORKERS: WorkerDef[] = activeProfile() === 'prod' ? PROD : DEMO
