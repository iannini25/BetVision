/**
 * Corner kick probability model.
 * Based on team attacking style, expected goals, and historical averages.
 */

type CornersInput = {
  homeExpectedGoals: number
  awayExpectedGoals: number
  homeCornerAvg: number
  awayCornerAvg: number
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

export type CornerProbabilities = {
  over8_5: number
  over9_5: number
  over10_5: number
  expectedTotal: number
}

export function calculateCornerProbabilities(input: CornersInput): CornerProbabilities {
  const goalFactor = (input.homeExpectedGoals + input.awayExpectedGoals) / 2.5
  const baseCorners = (input.homeCornerAvg + input.awayCornerAvg) * goalFactor

  const expectedTotal = Math.max(6, Math.min(16, baseCorners))
  const lambda = expectedTotal

  return {
    over8_5: 1 - poissonCdf(8, lambda),
    over9_5: 1 - poissonCdf(9, lambda),
    over10_5: 1 - poissonCdf(10, lambda),
    expectedTotal,
  }
}
