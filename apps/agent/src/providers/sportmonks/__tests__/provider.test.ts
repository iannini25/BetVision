import { describe, it, expect } from 'vitest'
import { SportmonksProvider } from '../provider'
import { SportmonksClient } from '../client'
import { MemoryCache } from '../cache'

function res(body: unknown): Response {
  return { status: 200, ok: true, json: async () => body } as unknown as Response
}

const fixture = {
  id: 100,
  state_id: 1,
  starting_at_timestamp: 1781000000,
  participants: [
    { id: 53, name: 'Brazil', short_code: 'BRA', meta: { location: 'home' } },
    { id: 62, name: 'Germany', short_code: 'GER', meta: { location: 'away' } },
  ],
  statistics: [
    { id: 1, type_id: 42, location: 'home', data: { value: 55 } },
    { id: 2, type_id: 42, location: 'away', data: { value: 45 } },
  ],
}

// Order matters: the odds URL also contains '/fixtures/100', so match it first.
const fetchFn = (async (url: string) => {
  if (url.includes('/types')) return res({ data: [{ id: 42, name: 'Ball Possession' }] })
  if (url.includes('/fixtures/date/')) return res({ data: [fixture] })
  if (url.includes('/odds/pre-match')) return res({ data: [{ id: 1, market_id: 1, label: '1', value: '1.50', bookmaker: { id: 2, name: 'bet365' } }] })
  if (url.includes('/fixtures/100')) return res({ data: fixture })
  return res({ data: [] })
}) as unknown as typeof fetch

function makeProvider() {
  const client = new SportmonksClient({ token: 't', cache: new MemoryCache(), sleep: async () => {}, fetchFn })
  return new SportmonksProvider(client)
}

describe('SportmonksProvider (mocked API)', () => {
  it('fetchTodayMatches maps fixtures with reference-resolved stats', async () => {
    const matches = await makeProvider().fetchTodayMatches()
    expect(matches).toHaveLength(1)
    expect(matches[0].externalId).toBe('100')
    expect(matches[0].homeTeam.shortName).toBe('BRA')
    expect(matches[0].stats!.possession).toEqual({ home: 55, away: 45 })
  })

  it('fetchOdds resolves participant shorts from the fixture', async () => {
    const odds = await makeProvider().fetchOdds('100')
    expect(odds[0]).toEqual({ bookmaker: 'bet365', market: 'winner', outcome: 'BRA vence', odds: 1.5 })
  })
})
