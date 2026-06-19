import { isSportmonksMode } from '@betv/shared'
import type { DataProvider } from './interface'
import { MockProvider } from './mock'
import { SportmonksProvider } from './sportmonks/provider'
import { SportmonksClient } from './sportmonks/client'
import { RedisCache } from './sportmonks/cache'
import { getRedis } from '../lib/redis'
import { logger } from '../lib/logger'
import { recordHeartbeat } from '../workers/heartbeat'

// Warn well before the client's hard throttle (rateLimitSafety in client.ts) so operators
// get early notice while the bucket is merely low, not yet exhausted.
const RATE_LIMIT_WARN_THRESHOLD = 200

// Re-export so workers keep importing the gate from '../providers'.
export { isSportmonksMode }

let cached: DataProvider | null = null

/**
 * Selects the data provider once per process. Real Sportmonks only when DATA_PROVIDER
 * is 'sportmonks' AND a token is present — otherwise mock, so the system always runs
 * without keys (the token, not just the env flag, flips it on).
 */
export function createDataProvider(): DataProvider {
  if (cached) return cached
  const mode = process.env.DATA_PROVIDER || 'mock'

  if (isSportmonksMode()) {
    cached = buildSportmonks()
  } else {
    if (mode === 'sportmonks') logger.warn('DATA_PROVIDER=sportmonks mas SPORTMONKS_TOKEN ausente → usando mock')
    else logger.info({ provider: mode }, 'using mock data provider')
    cached = new MockProvider()
  }
  return cached
}

function buildSportmonks(): DataProvider {
  const client = new SportmonksClient({
    token: process.env.SPORTMONKS_TOKEN as string,
    cache: new RedisCache(getRedis()),
    logger,
    onRateLimit: (entity, remaining, resetsInSeconds) => {
      if (remaining < RATE_LIMIT_WARN_THRESHOLD) logger.warn({ entity, remaining, resetsInSeconds }, 'sportmonks rate-limit baixo')
      void recordHeartbeat('sportmonks-api', { entity, remaining, resetsInSeconds })
    },
  })
  logger.info('using Sportmonks provider (dados reais)')
  return new SportmonksProvider(client)
}

export type {
  DataProvider, ProviderMatch, ProviderLineup, ProviderOdds, ProviderReferee, ProviderTeam, ProviderPlayer,
} from './interface'
