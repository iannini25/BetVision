import { describe, it, expect } from 'vitest'
import { calculateMatchProbabilities } from '../poisson'

describe('Poisson / Dixon-Coles Engine', () => {
  it('calculates probabilities for balanced teams', () => {
    const result = calculateMatchProbabilities({
      homeElo: 2000,
      awayElo: 2000,
      homeForm: ['V', 'V', 'E', 'V', 'D'],
      awayForm: ['V', 'E', 'V', 'D', 'V'],
    })

    expect(result.homeWin).toBeGreaterThan(0.3)
    expect(result.homeWin).toBeLessThan(0.6)
    expect(result.draw).toBeGreaterThan(0.15)
    expect(result.awayWin).toBeGreaterThan(0.15)

    const total = result.homeWin + result.draw + result.awayWin
    expect(total).toBeCloseTo(1, 2)
  })

  it('gives stronger team higher win probability', () => {
    const result = calculateMatchProbabilities({
      homeElo: 2100,
      awayElo: 1800,
      homeForm: ['V', 'V', 'V', 'V', 'V'],
      awayForm: ['D', 'D', 'E', 'D', 'V'],
    })

    expect(result.homeWin).toBeGreaterThan(result.awayWin)
    expect(result.homeWin).toBeGreaterThan(0.5)
  })

  it('reduces home advantage on neutral venue', () => {
    const home = calculateMatchProbabilities({
      homeElo: 2000,
      awayElo: 2000,
      homeForm: ['V', 'V', 'V', 'V', 'V'],
      awayForm: ['V', 'V', 'V', 'V', 'V'],
      isNeutralVenue: false,
    })

    const neutral = calculateMatchProbabilities({
      homeElo: 2000,
      awayElo: 2000,
      homeForm: ['V', 'V', 'V', 'V', 'V'],
      awayForm: ['V', 'V', 'V', 'V', 'V'],
      isNeutralVenue: true,
    })

    expect(home.homeWin).toBeGreaterThan(neutral.homeWin)
  })

  it('calculates over/under probabilities correctly', () => {
    const result = calculateMatchProbabilities({
      homeElo: 2100,
      awayElo: 2000,
      homeForm: ['V', 'V', 'V', 'V', 'V'],
      awayForm: ['V', 'V', 'V', 'V', 'V'],
    })

    expect(result.over1_5).toBeGreaterThan(result.over2_5)
    expect(result.over2_5).toBeGreaterThan(result.over3_5)
    expect(result.over1_5).toBeGreaterThan(0.5)
    expect(result.over1_5).toBeLessThanOrEqual(1)
    expect(result.over3_5).toBeGreaterThan(0)
  })

  it('calculates BTTS probability', () => {
    const result = calculateMatchProbabilities({
      homeElo: 2000,
      awayElo: 2000,
      homeForm: ['V', 'V', 'V', 'V', 'V'],
      awayForm: ['V', 'V', 'V', 'V', 'V'],
    })

    expect(result.btts).toBeGreaterThan(0.2)
    expect(result.btts).toBeLessThan(0.8)
  })

  it('returns expected goals', () => {
    const result = calculateMatchProbabilities({
      homeElo: 2100,
      awayElo: 1700,
      homeForm: ['V', 'V', 'V', 'V', 'V'],
      awayForm: ['D', 'D', 'D', 'D', 'D'],
    })

    expect(result.homeExpectedGoals).toBeGreaterThan(result.awayExpectedGoals)
    expect(result.homeExpectedGoals).toBeGreaterThan(0.5)
    expect(result.awayExpectedGoals).toBeGreaterThan(0.3)
  })
})
