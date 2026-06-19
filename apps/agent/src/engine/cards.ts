/**
 * Card probability model.
 * Factors: referee rigidity, match phase (knockouts = more cards), team discipline.
 */

type CardsInput = {
  refereeAvgYellows: number
  refereeRigidity: number
  isKnockout: boolean
  homeYellowAvg: number
  awayYellowAvg: number
}

function poissonCdf(k: number, lambda: number): number {
  let sum = 0
  for (let i = 0; i <= k; i++) {
    let factorial = 1
    for (let j = 2; j <= i; j++) factorial *= j
    sum += (Math.pow(lambda, i) * Math.exp(-lambda)) / factorial
  }
  return sum
}

export type CardProbabilities = {
  over3_5: number
  over4_5: number
  over5_5: number
  expectedCards: number
}

export function calculateCardProbabilities(input: CardsInput): CardProbabilities {
  const rigidityMultiplier = 0.7 + (input.refereeRigidity / 100) * 0.6
  const knockoutMultiplier = input.isKnockout ? 1.15 : 1.0

  const teamFactor = (input.homeYellowAvg + input.awayYellowAvg) / 4.0

  const expectedCards = input.refereeAvgYellows * rigidityMultiplier * knockoutMultiplier * teamFactor
  const lambda = Math.max(2, Math.min(8, expectedCards))

  return {
    over3_5: 1 - poissonCdf(3, lambda),
    over4_5: 1 - poissonCdf(4, lambda),
    over5_5: 1 - poissonCdf(5, lambda),
    expectedCards: lambda,
  }
}
