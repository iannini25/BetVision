import { and, eq, ne } from 'drizzle-orm'
import { round2, BOOKMAKERS_QUOTING } from '@betv/shared'
import { db, schema, pool } from '../lib/db'
import { logger } from '../lib/logger'
import { findValue } from '../engine'
import { createDataProvider, isSportmonksMode, type DataProvider } from '../providers'

const MIN_EDGE = 0.03
// Probability clamp (avoid div-by-~0) and per-bookmaker spread around fair odds:
// multiplier in [0.93, 1.09) lets some books sit below fair (no value) and some above.
const PROB_CLAMP = { min: 0.02, max: 0.98 }
const ODDS_SPREAD = { base: 0.93, range: 0.16 }

type LatestProb = { market: string; outcome: string; probability: number }

/**
 * For every non-finished match: derive bookmaker odds from the latest model
 * probabilities (each book biased above/below fair), snapshot them, and let the
 * value engine flag the best odds whose edge clears the threshold.
 * Insert on odds_snapshots / value_flags fires pg_notify -> the Radar updates live.
 */
export async function runOddsSync(): Promise<Record<string, unknown>> {
  const active = await db.select().from(schema.matches).where(ne(schema.matches.status, 'finished'))
  if (isSportmonksMode()) return syncRealOdds(active, createDataProvider())

  let snapshots = 0
  let flags = 0

  for (const match of active) {
    const probs = await latestProbs(match.id)
    const rows: (typeof schema.oddsSnapshots.$inferInsert)[] = []

    for (const prob of probs) {
      const oddsEntries = quoteBookmakers(prob.probability)
      for (const entry of oddsEntries) {
        rows.push({ matchId: match.id, market: prob.market, outcome: prob.outcome, bookmaker: entry.bookmaker, odds: entry.odds })
      }
      flags += await refreshValueFlag(match.id, prob, oddsEntries)
    }

    if (rows.length > 0) {
      await db.insert(schema.oddsSnapshots).values(rows)
      snapshots += rows.length
    }
  }

  return { matches: active.length, snapshots, valueFlags: flags }
}

// Real odds path: snapshot the provider's bookmaker odds and recompute value flags by
// pairing each snapshot outcome with the model's latest probability for that outcome.
async function syncRealOdds(
  active: (typeof schema.matches.$inferSelect)[],
  provider: DataProvider
): Promise<Record<string, unknown>> {
  let snapshots = 0
  let flags = 0
  let matchesWithOdds = 0

  for (const match of active) {
    if (!match.externalId) continue
    const odds = await provider.fetchOdds(match.externalId)
    if (odds.length === 0) continue
    matchesWithOdds++

    await db.insert(schema.oddsSnapshots).values(
      odds.map((o) => ({ matchId: match.id, market: o.market, outcome: o.outcome, bookmaker: o.bookmaker, odds: o.odds }))
    )
    snapshots += odds.length

    const byOutcome = new Map<string, { bookmaker: string; odds: number }[]>()
    for (const o of odds) {
      const key = `${o.market}|${o.outcome}`
      const list = byOutcome.get(key) ?? []
      list.push({ bookmaker: o.bookmaker, odds: o.odds })
      byOutcome.set(key, list)
    }

    for (const prob of await latestProbs(match.id)) {
      const entries = byOutcome.get(`${prob.market}|${prob.outcome}`)
      if (entries?.length) flags += await refreshValueFlag(match.id, prob, entries)
    }
  }

  // Odds ingested but nothing paired usually means probabilities are missing (no prob
  // worker ran) or the outcome strings drifted between model and odds — surface it.
  if (matchesWithOdds > 0 && flags === 0) {
    logger.warn({ matchesWithOdds, snapshots }, 'odds snapshotted but no value flags paired — check probabilities worker / outcome keys')
  }

  return { mode: 'sportmonks', matchesWithOdds, snapshots, valueFlags: flags }
}

function quoteBookmakers(probability: number): { bookmaker: string; odds: number }[] {
  const fair = 1 / Math.max(PROB_CLAMP.min, Math.min(PROB_CLAMP.max, probability))
  return BOOKMAKERS_QUOTING.map((bookmaker) => ({
    bookmaker,
    odds: round2(fair * (ODDS_SPREAD.base + Math.random() * ODDS_SPREAD.range)),
  }))
}

async function refreshValueFlag(
  matchId: number,
  prob: LatestProb,
  oddsEntries: { bookmaker: string; odds: number }[]
): Promise<number> {
  const value = findValue(prob.market, prob.outcome, prob.probability, oddsEntries, MIN_EDGE)
  if (!value?.isValue) return 0

  await db
    .update(schema.valueFlags)
    .set({ active: false })
    .where(
      and(
        eq(schema.valueFlags.matchId, matchId),
        eq(schema.valueFlags.market, prob.market),
        eq(schema.valueFlags.outcome, prob.outcome),
        eq(schema.valueFlags.active, true)
      )
    )
  await db.insert(schema.valueFlags).values({
    matchId,
    market: prob.market,
    outcome: prob.outcome,
    modelProb: prob.probability,
    bestOdds: value.bestOdds,
    bestBookmaker: value.bestBookmaker,
    edge: value.edge,
  })
  return 1
}

// Most recent probability per (market, outcome) for a match.
async function latestProbs(matchId: number): Promise<LatestProb[]> {
  const result = await pool.query(
    `SELECT DISTINCT ON (market, outcome) market, outcome, probability
     FROM probabilities WHERE match_id = $1
     ORDER BY market, outcome, calculado_em DESC`,
    [matchId]
  )
  return result.rows as LatestProb[]
}
