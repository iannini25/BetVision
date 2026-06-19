import type { Cache } from './cache'
import type { SmEnvelope } from './types'
import type { SmRequest } from './endpoints'

const DEFAULTS = {
  timeoutMs: 12_000,
  maxRetries: 3,
  backoffBaseMs: 500,
  backoffCapMs: 8_000,
  // Leave headroom below the plan cap: throttle once an entity bucket drops this low.
  rateLimitSafety: 50,
  lastGoodTtl: 7 * 86_400,
}

export class SportmonksError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'SportmonksError'
  }
}

type Logger = { info: (o: unknown, m?: string) => void; warn: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void }
const NOOP_LOGGER: Logger = { info: () => {}, warn: () => {}, error: () => {} }

export type SmClientDeps = {
  token: string
  cache: Cache
  fetchFn?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  random?: () => number
  logger?: Logger
  /** Called with each response's rate_limit so callers can surface it (system_health). */
  onRateLimit?: (entity: string, remaining: number, resetsInSeconds: number) => void
  maxRetries?: number
  timeoutMs?: number
}

/**
 * Resilient Sportmonks HTTP client. One method, `request`, layered with:
 *  1) short cache (dedups bursts, bounds quota),
 *  2) per-entity client-side throttle (limits are per-entity in the v3 API),
 *  3) retry with exponential backoff + jitter, honouring `retry_after` on 429,
 *  4) graceful degradation: on exhausted retries it returns the last good payload
 *     from cache instead of throwing, so a screen shows stale data, not an error.
 * All collaborators (fetch/cache/sleep/clock/random) are injectable for testing.
 */
export class SportmonksClient {
  private token: string
  private cache: Cache
  private fetchFn: typeof fetch
  private sleep: (ms: number) => Promise<void>
  private now: () => number
  private random: () => number
  private logger: Logger
  private onRateLimit?: SmClientDeps['onRateLimit']
  private maxRetries: number
  private timeoutMs: number

  constructor(deps: SmClientDeps) {
    if (!deps.token) throw new SportmonksError('SPORTMONKS_TOKEN ausente')
    this.token = deps.token
    this.cache = deps.cache
    this.fetchFn = deps.fetchFn ?? fetch
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    this.now = deps.now ?? Date.now
    this.random = deps.random ?? Math.random
    this.logger = deps.logger ?? NOOP_LOGGER
    this.onRateLimit = deps.onRateLimit
    this.maxRetries = deps.maxRetries ?? DEFAULTS.maxRetries
    this.timeoutMs = deps.timeoutMs ?? DEFAULTS.timeoutMs
  }

  async request<T>(req: SmRequest): Promise<T> {
    const cacheKey = `sm:cache:${req.url}`
    const lastGoodKey = `sm:last:${req.url}`

    if (req.cacheTtl > 0) {
      const cached = await this.cache.get(cacheKey)
      if (cached) return JSON.parse(cached) as T
    }

    await this.throttle(req.entity)

    const url = this.withToken(req.url)
    let attempt = 0
    for (;;) {
      try {
        const res = await this.fetchWithTimeout(url)
        const env = (await res.json()) as SmEnvelope<T>
        await this.noteRateLimit(req.entity, env.rate_limit)

        if (res.status === 429) {
          if (attempt++ >= this.maxRetries) throw new SportmonksError(env.message || 'rate limited', 429)
          await this.sleep(this.backoff(attempt, env.rate_limit?.resets_in_seconds))
          continue
        }
        if (res.status >= 500) {
          if (attempt++ >= this.maxRetries) throw new SportmonksError(env.message || `upstream ${res.status}`, res.status)
          await this.sleep(this.backoff(attempt))
          continue
        }
        if (!res.ok) throw new SportmonksError(env.message || `HTTP ${res.status}`, res.status)

        const data = env.data
        const payload = JSON.stringify(data)
        if (req.cacheTtl > 0) await this.cache.set(cacheKey, payload, req.cacheTtl)
        await this.cache.set(lastGoodKey, payload, DEFAULTS.lastGoodTtl)
        return data
      } catch (err) {
        // A 4xx (other than 429) is a real client error — do not retry or mask it.
        if (err instanceof SportmonksError && err.status && err.status < 500 && err.status !== 429) throw err
        if (attempt++ < this.maxRetries) {
          await this.sleep(this.backoff(attempt))
          continue
        }
        const lastGood = await this.cache.get(lastGoodKey)
        if (lastGood) {
          this.logger.warn({ url: req.url, err: String(err) }, 'sportmonks degraded to last-good cache')
          return JSON.parse(lastGood) as T
        }
        throw err
      }
    }
  }

  private withToken(url: string): string {
    return `${url}${url.includes('?') ? '&' : '?'}api_token=${this.token}`
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await this.fetchFn(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    } finally {
      clearTimeout(timer)
    }
  }

  /** Exponential backoff with jitter; never less than retry_after when the API sent one. */
  private backoff(attempt: number, retryAfterSeconds?: number): number {
    const exp = Math.min(DEFAULTS.backoffCapMs, DEFAULTS.backoffBaseMs * 2 ** (attempt - 1))
    const jittered = exp / 2 + this.random() * (exp / 2)
    return Math.max(jittered, (retryAfterSeconds ?? 0) * 1000)
  }

  private async noteRateLimit(entity: string, rl?: SmEnvelope<unknown>['rate_limit']): Promise<void> {
    if (!rl || rl.remaining == null) return
    const resetsIn = rl.resets_in_seconds ?? 0
    this.onRateLimit?.(entity, rl.remaining, resetsIn)
    await this.cache.set(
      `sm:rl:${entity}`,
      JSON.stringify({ remaining: rl.remaining, resetAt: this.now() + resetsIn * 1000 }),
      Math.max(1, resetsIn)
    )
  }

  /** If an entity bucket is nearly exhausted, wait until its window resets. */
  private async throttle(entity: string): Promise<void> {
    const raw = await this.cache.get(`sm:rl:${entity}`)
    if (!raw) return
    const { remaining, resetAt } = JSON.parse(raw) as { remaining: number; resetAt: number }
    const wait = resetAt - this.now()
    if (remaining <= DEFAULTS.rateLimitSafety && wait > 0) {
      this.logger.warn({ entity, remaining, wait }, 'sportmonks entity throttled until reset')
      await this.sleep(Math.min(wait, DEFAULTS.backoffCapMs))
    }
  }
}
