import { describe, it, expect } from 'vitest'
import { SportmonksClient, SportmonksError } from '../client'
import { MemoryCache } from '../cache'

function res(status: number, body: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response
}
const noSleep = async () => {}

describe('SportmonksClient', () => {
  it('serves a fresh cache hit without fetching', async () => {
    const cache = new MemoryCache()
    await cache.set('sm:cache:http://x?a=1', JSON.stringify({ hi: 1 }), 60)
    let calls = 0
    const client = new SportmonksClient({
      token: 't', cache, sleep: noSleep,
      fetchFn: (async () => { calls++; return res(200, { data: { hi: 2 } }) }) as unknown as typeof fetch,
    })
    const out = await client.request({ entity: 'Fixture', url: 'http://x?a=1', cacheTtl: 60 })
    expect(out).toEqual({ hi: 1 })
    expect(calls).toBe(0)
  })

  it('appends the token and caches successful responses', async () => {
    const cache = new MemoryCache()
    let seenUrl = ''
    const client = new SportmonksClient({
      token: 'secret', cache, sleep: noSleep,
      fetchFn: (async (url: string) => { seenUrl = url; return res(200, { data: { ok: true } }) }) as unknown as typeof fetch,
    })
    const out = await client.request({ entity: 'Fixture', url: 'http://y?z=1', cacheTtl: 60 })
    expect(out).toEqual({ ok: true })
    expect(seenUrl).toBe('http://y?z=1&api_token=secret')
    expect(await cache.get('sm:cache:http://y?z=1')).toBe(JSON.stringify({ ok: true }))
  })

  it('retries a 429 then succeeds', async () => {
    const cache = new MemoryCache()
    let calls = 0
    const client = new SportmonksClient({
      token: 't', cache, sleep: noSleep, random: () => 0.5,
      fetchFn: (async () => {
        calls++
        if (calls === 1) return res(429, { message: 'rate', rate_limit: { remaining: 0, resets_in_seconds: 1 } })
        return res(200, { data: { ok: true } })
      }) as unknown as typeof fetch,
    })
    const out = await client.request({ entity: 'Fixture', url: 'http://r', cacheTtl: 0 })
    expect(out).toEqual({ ok: true })
    expect(calls).toBe(2)
  })

  it('degrades to last-good cache on persistent failure', async () => {
    const cache = new MemoryCache()
    await cache.set('sm:last:http://z', JSON.stringify({ stale: true }), 1000)
    const client = new SportmonksClient({
      token: 't', cache, sleep: noSleep, maxRetries: 1,
      fetchFn: (async () => { throw new Error('network down') }) as unknown as typeof fetch,
    })
    const out = await client.request({ entity: 'Fixture', url: 'http://z', cacheTtl: 0 })
    expect(out).toEqual({ stale: true })
  })

  it('throws a 4xx immediately without retrying', async () => {
    const cache = new MemoryCache()
    let calls = 0
    const client = new SportmonksClient({
      token: 't', cache, sleep: noSleep,
      fetchFn: (async () => { calls++; return res(404, { message: 'not found' }) }) as unknown as typeof fetch,
    })
    await expect(client.request({ entity: 'Fixture', url: 'http://nf', cacheTtl: 0 })).rejects.toBeInstanceOf(SportmonksError)
    expect(calls).toBe(1)
  })
})
