/**
 * Poisson / Dixon-Coles model for match outcome probabilities.
 * Calculates: winner (home/draw/away), over/under goals, BTTS.
 */

function factorial(n: number): number {
  if (n <= 1) return 1
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

function poissonPmf(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k)
}

type PoissonInput = {
  homeElo: number
  awayElo: number
  homeForm: string[]
  awayForm: string[]
  isNeutralVenue?: boolean
}

type GoalMatrix = number[][]

function expectedGoals(input: PoissonInput) {
  const eloDiff = input.homeElo - input.awayElo
  const homeAdvantage = input.isNeutralVenue ? 0.1 : 0.3

  const homeFormFactor = formMultiplier(input.homeForm)
  const awayFormFactor = formMultiplier(input.awayForm)

  const baseHome = 1.35
  const baseAway = 1.10

  const homeExpected = Math.max(
    0.3,
    baseHome + (eloDiff / 800) + homeAdvantage + homeFormFactor * 0.15
  )
  const awayExpected = Math.max(
    0.3,
    baseAway - (eloDiff / 800) + awayFormFactor * 0.15
  )

  return { homeExpected, awayExpected }
}

function formMultiplier(form: string[]): number {
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1]
  let score = 0
  const reversed = [...form].reverse()
  for (let i = 0; i < Math.min(reversed.length, 5); i++) {
    const r = reversed[i]
    const val = r === 'V' || r === 'W' ? 1 : r === 'E' || r === 'D' ? 0 : -1
    score += val * weights[i]
  }
  return score
}

function buildGoalMatrix(homeLambda: number, awayLambda: number, maxGoals = 8): GoalMatrix {
  const matrix: GoalMatrix = []
  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = []
    for (let a = 0; a <= maxGoals; a++) {
      matrix[h][a] = poissonPmf(h, homeLambda) * poissonPmf(a, awayLambda)
    }
  }
  return matrix
}

function dixonColesAdjustment(
  matrix: GoalMatrix,
  homeLambda: number,
  awayLambda: number,
  rho = -0.13
): GoalMatrix {
  const adjusted = matrix.map((row) => [...row])
  const tau = (h: number, a: number) => {
    if (h === 0 && a === 0) return 1 - homeLambda * awayLambda * rho
    if (h === 0 && a === 1) return 1 + homeLambda * rho
    if (h === 1 && a === 0) return 1 + awayLambda * rho
    if (h === 1 && a === 1) return 1 - rho
    return 1
  }

  for (let h = 0; h <= 1; h++) {
    for (let a = 0; a <= 1; a++) {
      adjusted[h][a] *= tau(h, a)
    }
  }
  return adjusted
}

export type MatchProbabilities = {
  homeWin: number
  draw: number
  awayWin: number
  over1_5: number
  over2_5: number
  over3_5: number
  btts: number
  homeExpectedGoals: number
  awayExpectedGoals: number
}

export function calculateMatchProbabilities(input: PoissonInput): MatchProbabilities {
  const { homeExpected, awayExpected } = expectedGoals(input)

  let matrix = buildGoalMatrix(homeExpected, awayExpected)
  matrix = dixonColesAdjustment(matrix, homeExpected, awayExpected)

  let homeWin = 0
  let draw = 0
  let awayWin = 0
  let under1_5 = 0
  let under2_5 = 0
  let under3_5 = 0
  let noBtts = 0

  for (let h = 0; h < matrix.length; h++) {
    for (let a = 0; a < matrix[h].length; a++) {
      const p = matrix[h][a]
      if (h > a) homeWin += p
      else if (h === a) draw += p
      else awayWin += p

      if (h + a <= 1) under1_5 += p
      if (h + a <= 2) under2_5 += p
      if (h + a <= 3) under3_5 += p
      if (h === 0 || a === 0) noBtts += p
    }
  }

  const total = homeWin + draw + awayWin
  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
    over1_5: 1 - under1_5,
    over2_5: 1 - under2_5,
    over3_5: 1 - under3_5,
    btts: 1 - noBtts,
    homeExpectedGoals: homeExpected,
    awayExpectedGoals: awayExpected,
  }
}
