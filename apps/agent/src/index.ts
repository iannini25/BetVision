import { logger } from './lib/logger'
import { startScheduler } from './workers/scheduler'

logger.info('BetV Agent starting...')
logger.info(
  `AI: ${process.env.AI_API_KEY ? 'LIVE' : 'MOCK'} · Data provider: ${process.env.DATA_PROVIDER || 'mock'}`
)

const { queue, worker } = startScheduler()

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down agent...')
  await worker.close()
  await queue.close()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
