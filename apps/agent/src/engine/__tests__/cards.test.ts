import { describe, it, expect } from 'vitest'
import { calculateCardProbabilities } from '../cards'

describe('Cards Engine', () => {
  it('gives higher card probability for strict referees', () => {
    const strict = calculateCardProbabilities({
      refereeAvgYellows: 4.8,
      refereeRigidity: 76,
      isKnockout: false,
      homeYellowAvg: 2.0,
      awayYellowAvg: 2.0,
    })

    const lenient = calculateCardProbabilities({
      refereeAvgYellows: 3.1,
      refereeRigidity: 38,
      isKnockout: false,
      homeYellowAvg: 2.0,
      awayYellowAvg: 2.0,
    })

    expect(strict.expectedCards).toBeGreaterThan(lenient.expectedCards)
    expect(strict.over3_5).toBeGreaterThan(lenient.over3_5)
    expect(strict.over4_5).toBeGreaterThan(lenient.over4_5)
  })

  it('increases cards for knockout matches', () => {
    const group = calculateCardProbabilities({
      refereeAvgYellows: 4.0,
      refereeRigidity: 55,
      isKnockout: false,
      homeYellowAvg: 2.0,
      awayYellowAvg: 2.0,
    })

    const knockout = calculateCardProbabilities({
      refereeAvgYellows: 4.0,
      refereeRigidity: 55,
      isKnockout: true,
      homeYellowAvg: 2.0,
      awayYellowAvg: 2.0,
    })

    expect(knockout.expectedCards).toBeGreaterThan(group.expectedCards)
  })

  it('returns probabilities between 0 and 1', () => {
    const result = calculateCardProbabilities({
      refereeAvgYellows: 4.8,
      refereeRigidity: 76,
      isKnockout: true,
      homeYellowAvg: 3.0,
      awayYellowAvg: 2.5,
    })

    expect(result.over3_5).toBeGreaterThan(0)
    expect(result.over3_5).toBeLessThanOrEqual(1)
    expect(result.over5_5).toBeGreaterThan(0)
    expect(result.over5_5).toBeLessThan(result.over3_5)
  })
})
