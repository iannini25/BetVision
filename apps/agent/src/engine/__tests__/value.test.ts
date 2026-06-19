import { describe, it, expect } from 'vitest'
import { calculateEdge, impliedProbability, findValue } from '../value'

describe('Value Engine', () => {
  it('calculates edge correctly', () => {
    expect(calculateEdge(0.6, 2.0)).toBeCloseTo(0.2, 2)
    expect(calculateEdge(0.5, 2.0)).toBeCloseTo(0, 2)
    expect(calculateEdge(0.4, 2.0)).toBeCloseTo(-0.2, 2)
  })

  it('calculates implied probability from odds', () => {
    expect(impliedProbability(2.0)).toBeCloseTo(0.5, 2)
    expect(impliedProbability(1.5)).toBeCloseTo(0.667, 2)
    expect(impliedProbability(4.0)).toBeCloseTo(0.25, 2)
  })

  it('finds value when edge exceeds threshold', () => {
    const result = findValue(
      'winner',
      'BRA vence',
      0.65,
      [
        { bookmaker: 'Bet365', odds: 1.80 },
        { bookmaker: 'Betano', odds: 1.75 },
      ],
      0.03
    )

    expect(result).not.toBeNull()
    expect(result!.bestBookmaker).toBe('Bet365')
    expect(result!.bestOdds).toBe(1.80)
    expect(result!.edge).toBeGreaterThan(0.03)
    expect(result!.isValue).toBe(true)
  })

  it('returns no value when edge is below threshold', () => {
    const result = findValue(
      'winner',
      'BRA vence',
      0.50,
      [{ bookmaker: 'Bet365', odds: 1.95 }],
      0.03
    )

    expect(result).not.toBeNull()
    expect(result!.isValue).toBe(false)
  })

  it('returns null for empty odds', () => {
    const result = findValue('winner', 'BRA vence', 0.65, [])
    expect(result).toBeNull()
  })
})
