/**
 * Value detection engine.
 * Compares model probability with implied probability from odds.
 * edge = modelProb * odds - 1
 * Positive edge = value bet (model says it's worth more than the odds imply).
 */

export type ValueResult = {
  market: string
  outcome: string
  modelProb: number
  bestOdds: number
  bestBookmaker: string
  impliedProb: number
  edge: number
  isValue: boolean
}

type OddsEntry = {
  bookmaker: string
  odds: number
}

export function calculateEdge(modelProb: number, odds: number): number {
  return modelProb * odds - 1
}

export function impliedProbability(odds: number): number {
  return 1 / odds
}

export function findValue(
  market: string,
  outcome: string,
  modelProb: number,
  oddsEntries: OddsEntry[],
  minEdge = 0.03
): ValueResult | null {
  if (oddsEntries.length === 0) return null

  const best = oddsEntries.reduce((a, b) => (a.odds > b.odds ? a : b))
  const edge = calculateEdge(modelProb, best.odds)
  const implied = impliedProbability(best.odds)

  return {
    market,
    outcome,
    modelProb,
    bestOdds: best.odds,
    bestBookmaker: best.bookmaker,
    impliedProb: implied,
    edge,
    isValue: edge >= minEdge,
  }
}
