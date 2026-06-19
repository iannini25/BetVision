import { describe, it, expect } from 'vitest'
import { normalizeName, matchTeam, shortCode, type TeamLike } from '../normalize'

describe('normalizeName', () => {
  it('strips accents and lowercases', () => {
    expect(normalizeName('Brasil')).toBe('brasil')
    expect(normalizeName('São Paulo')).toBe('sao paulo')
    expect(normalizeName('  França ')).toBe('franca')
  })
})

describe('matchTeam', () => {
  it('matches by externalId first', () => {
    const existing: TeamLike[] = [{ id: 1, externalId: '53', name: 'Brasil', shortName: 'BRA' }]
    expect(matchTeam(existing, { id: 53, name: 'Brazil', short_code: 'XXX' })?.id).toBe(1)
  })

  it('matches by short_code when no externalId', () => {
    const existing: TeamLike[] = [{ id: 1, externalId: null, name: 'Brasil', shortName: 'BRA' }]
    expect(matchTeam(existing, { id: 53, name: 'Brazil', short_code: 'BRA' })?.id).toBe(1)
  })

  it('matches the seeded (Portuguese) team via the English alias', () => {
    const existing: TeamLike[] = [{ id: 2, externalId: null, name: 'Alemanha', shortName: 'ALE' }]
    expect(matchTeam(existing, { id: 62, name: 'Germany', short_code: 'GER' })?.id).toBe(2)
  })

  it('returns undefined when nothing matches', () => {
    const existing: TeamLike[] = [{ id: 1, externalId: null, name: 'Brasil', shortName: 'BRA' }]
    expect(matchTeam(existing, { id: 99, name: 'Japan', short_code: 'JPN' })).toBeUndefined()
  })
})

describe('shortCode', () => {
  it('uses short_code when present', () => {
    expect(shortCode({ id: 1, name: 'Brazil', short_code: 'BRA' })).toBe('BRA')
  })
  it('falls back to the first letters of the name', () => {
    expect(shortCode({ id: 1, name: 'Brazil' })).toBe('BRA')
  })
})
