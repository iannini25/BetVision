/**
 * Tiny string cache abstraction so the Sportmonks client can be unit-tested with an
 * in-memory cache (no Redis) and run in production against Redis. Values are JSON
 * strings; TTL is in seconds. Reads never throw — a cache miss/outage returns null.
 */
export interface Cache {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
}

/** In-memory cache with per-key expiry — used by tests and as a safe fallback. */
export class MemoryCache implements Cache {
  private store = new Map<string, { value: string; expiresAt: number }>()
  constructor(private nowFn: () => number = Date.now) {}

  async get(key: string): Promise<string | null> {
    const hit = this.store.get(key)
    if (!hit) return null
    if (hit.expiresAt <= this.nowFn()) {
      this.store.delete(key)
      return null
    }
    return hit.value
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: this.nowFn() + ttlSeconds * 1000 })
  }
}

/**
 * Redis-backed cache (ioredis). Wraps every call in try/catch and degrades to a
 * no-op/null on any Redis error, so a Redis blip never takes down a data fetch.
 */
export class RedisCache implements Cache {
  // Loosely typed to avoid a hard ioredis type dependency at this layer.
  constructor(private redis: { get(k: string): Promise<string | null>; set(...args: unknown[]): Promise<unknown> }) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds)
    } catch {
      /* ignore cache write failures */
    }
  }
}
