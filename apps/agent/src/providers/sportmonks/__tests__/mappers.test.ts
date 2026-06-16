import { describe, it, expect } from 'vitest'
import { mapFixtureToMatch, mapLineups, mapOdds, participantShort } from '../mappers'
import type { SmFixture, SmOdd } from '../types'

const statKey = (id: number) => (id === 42 ? 'possession' : id === 86 ? 'shotsOnTarget' : null)

describe('mapFixtureToMatch', () => {
  const fixture: SmFixture = {
    id: 18535517,
    state_id: 22, // 2nd half -> live
    starting_at_timestamp: 1781000000,
    participants: [
      { id: 53, name: 'Brazil', short_code: 'BRA', meta: { location: 'home' } },
      { id: 62, name: 'Germany', short_code: 'GER', meta: { location: 'away' } },
    ],
    scores: [
      { id: 1, description: 'CURRENT', score: { goals: 2, participant: 'home' } },
      { id: 2, description: 'CURRENT', score: { goals: 1, participant: 'away' } },
      { id: 3, description: '1ST_HALF', score: { goals: 1, participant: 'home' } },
    ],
    events: [
      { id: 1, type_id: 14, participant_id: 53, player_name: 'Vinicius', minute: 62, sort_order: 5 },
      { id: 2, type_id: 83, participant_id: 62, player_name: 'Kimmich', minute: 41, sort_order: 3 },
      { id: 3, type_id: 999, minute: 10, sort_order: 1 }, // unknown type -> filtered out
    ],
    statistics: [
      { id: 1, type_id: 42, location: 'home', data: { value: 60 } },
      { id: 2, type_id: 42, location: 'away', data: { value: 40 } },
    ],
    venue: { name: 'MetLife', city_name: 'New Jersey' },
  }

  it('extracts teams, status, score and venue', () => {
    const m = mapFixtureToMatch(fixture, statKey)
    expect(m.externalId).toBe('18535517')
    expect(m.homeTeam).toEqual({ name: 'Brazil', shortName: 'BRA' })
    expect(m.awayTeam).toEqual({ name: 'Germany', shortName: 'GER' })
    expect(m.status).toBe('live')
    expect(m.period).toBe('2nd_half')
    expect(m.homeScore).toBe(2)
    expect(m.awayScore).toBe(1)
    expect(m.venue).toBe('MetLife')
    expect(m.city).toBe('New Jersey')
  })

  it('filters unknown events and orders by sort_order', () => {
    const m = mapFixtureToMatch(fixture, statKey)
    expect(m.events).toHaveLength(2)
    expect(m.events![0]).toMatchObject({ type: 'card', minute: 41, team: 'GER' })
    expect(m.events![1]).toMatchObject({ type: 'goal', minute: 62, team: 'BRA', player: 'Vinicius' })
  })

  it('maps statistics by resolved key, ignoring unmapped types', () => {
    const m = mapFixtureToMatch(fixture, statKey)
    expect(m.stats).toEqual({ possession: { home: 60, away: 40 } })
  })

  it('defaults gracefully when fields are missing', () => {
    const m = mapFixtureToMatch({ id: 7 }, statKey)
    expect(m.externalId).toBe('7')
    expect(m.status).toBe('scheduled')
    expect(m.homeScore).toBeUndefined()
    expect(m.events).toEqual([])
  })

  it('keeps the semantic event detail over free-text addition', () => {
    const f: SmFixture = {
      id: 8,
      participants: [{ id: 53, name: 'Brazil', short_code: 'BRA', meta: { location: 'home' } }],
      events: [
        { id: 1, type_id: 84, participant_id: 53, player_name: 'X', minute: 70, addition: '2nd yellow card', sort_order: 1 },
        { id: 2, type_id: 10, minute: 58, addition: 'Goal Disallowed', sort_order: 2 },
      ],
    }
    const m = mapFixtureToMatch(f, statKey)
    expect(m.events![0]).toMatchObject({ type: 'card', detail: 'red' }) // not '2nd yellow card'
    expect(m.events![1]).toMatchObject({ type: 'var', detail: 'Goal Disallowed' }) // falls back to addition
  })

  it('omits statistics whose side cannot be determined', () => {
    const f: SmFixture = {
      id: 9,
      participants: [
        { id: 53, name: 'Brazil', short_code: 'BRA' }, // no meta.location
        { id: 62, name: 'Germany', short_code: 'GER' },
      ],
      statistics: [{ id: 1, type_id: 42, participant_id: 999, data: { value: 60 } }], // unknown participant, no location
    }
    const m = mapFixtureToMatch(f, statKey)
    expect(m.stats).toEqual({}) // not silently bucketed to 'away'
  })
})

describe('mapOdds', () => {
  const odds: SmOdd[] = [
    { id: 1, market_id: 1, label: '1', value: '1.75', bookmaker: { id: 2, name: 'bet365' } },
    { id: 2, market_id: 1, label: 'X', value: '3.60', bookmaker: { id: 2, name: 'bet365' } },
    { id: 3, market_id: 1, label: '2', value: '4.80', bookmaker: { id: 5, name: 'Betano' } },
    { id: 4, market_id: 14, label: 'Yes', value: '1.85', bookmaker: { id: 2, name: 'bet365' } },
    { id: 5, market_id: 80, label: 'Over', total: '2.5', value: '1.62', bookmaker: { id: 2, name: 'bet365' } },
    { id: 6, market_id: 80, label: 'Over', total: '3.5', value: '2.20', bookmaker: { id: 2, name: 'bet365' } },
    { id: 7, market_id: 999, label: 'x', value: '2.00', bookmaker: { id: 2, name: 'bet365' } },
  ]

  it('maps the model markets and skips the rest', () => {
    const out = mapOdds(odds, { homeShort: 'BRA', awayShort: 'GER' })
    expect(out).toHaveLength(5)
    expect(out).toContainEqual({ bookmaker: 'bet365', market: 'winner', outcome: 'BRA vence', odds: 1.75 })
    expect(out).toContainEqual({ bookmaker: 'Betano', market: 'winner', outcome: 'GER vence', odds: 4.8 })
    expect(out.find((o) => o.market === 'btts')).toMatchObject({ outcome: 'Sim', odds: 1.85 })
    expect(out.find((o) => o.market === 'over_under_2_5')).toMatchObject({ outcome: 'Over 2.5', odds: 1.62 })
  })
})

describe('mapLineups', () => {
  it('groups players by team with formation', () => {
    const f: SmFixture = {
      id: 1,
      participants: [
        { id: 53, name: 'Brazil', short_code: 'BRA' },
        { id: 62, name: 'Germany', short_code: 'GER' },
      ],
      formations: [{ participant_id: 53, formation: '4-3-3' }],
      lineups: [
        { id: 1, team_id: 53, player_name: 'Alisson', jersey_number: 1 },
        { id: 2, team_id: 53, player_name: 'Casemiro', jersey_number: 5 },
        { id: 3, team_id: 62, player_name: 'Neuer', jersey_number: 1 },
      ],
    }
    const lus = mapLineups(f)
    expect(lus).toHaveLength(2)
    const bra = lus.find((l) => l.teamName === 'Brazil')!
    expect(bra.formation).toBe('4-3-3')
    expect(bra.confirmed).toBe(true)
    expect(bra.players).toEqual([
      { name: 'Alisson', number: 1 },
      { name: 'Casemiro', number: 5 },
    ])
  })
})

describe('participantShort', () => {
  it('prefers short_code, falls back to name', () => {
    expect(participantShort({ id: 1, name: 'Brazil', short_code: 'BRA' })).toBe('BRA')
    expect(participantShort({ id: 1, name: 'Brazil' })).toBe('BRA')
    expect(participantShort(undefined)).toBe('')
  })
})
