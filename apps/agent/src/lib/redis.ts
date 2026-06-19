import Redis from 'ioredis'

let client: Redis | null = null

/**
 * Shared lazy ioredis client (one per process) for the Sportmonks cache / rate-limit
 * state. Created on first use so mock mode never opens a Redis connection it won't use.
 */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    })
    client.on('error', () => {
      /* RedisCache already degrades on errors; swallow to avoid noisy unhandled events */
    })
  }
  return client
}
