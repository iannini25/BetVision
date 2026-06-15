/**
 * VAR / Penalty probability model.
 * Based on referee penalty rate, match intensity, and historical frequency.
 */

type VarInput = {
  refereePenaltyRate: number
  homeExpectedGoals: number
  awayExpectedGoals: number
  isKnockout: boolean
}

export type VarProbabilities = {
  penalty: number
  varIntervention: number
}

export function calculateVarProbabilities(input: VarInput): VarProbabilities {
  const baseRate = input.refereePenaltyRate
  const intensityFactor = Math.min(1.5, (input.homeExpectedGoals + input.awayExpectedGoals) / 2.5)
  const knockoutFactor = input.isKnockout ? 1.2 : 1.0

  const penaltyProb = Math.min(0.65, baseRate * intensityFactor * knockoutFactor)
  const varProb = Math.min(0.80, penaltyProb * 1.8)

  return {
    penalty: penaltyProb,
    varIntervention: varProb,
  }
}
