import { ne } from 'drizzle-orm'
import { db, schema } from '../lib/db'
import { teamById, refereeById, baseProbabilities, probabilityRows } from './live-engine'

/**
 * Production probabilities worker. For every non-finished match it computes the model's
 * probabilities (pre-match base, adjusted for the live score/minute that live-sync has
 * already written from real Sportmonks data) and appends them to `probabilities`.
 *
 * This is the real-mode counterpart of the mock live-engine's probability step — and it
 * is essential: without a probabilities writer in the prod profile, odds-sync's value
 * engine has no model probability to pair real odds against, so the Radar would be empty.
 * Reuses live-engine's extracted helpers so the (market, outcome) keys match exactly.
 * Only registered in the prod (sportmonks) cadence profile.
 */
export async function runProbabilities(): Promise<Record<string, unknown>> {
  const active = await db.select().from(schema.matches).where(ne(schema.matches.status, 'finished'))
  let computed = 0
  for (const match of active) {
    const home = await teamById(match.homeTeamId)
    const away = await teamById(match.awayTeamId)
    const referee = await refereeById(match.refereeId)
    const base = baseProbabilities(home, away)
    const minute = match.minute ?? 0
    const score = { home: match.homeScore ?? 0, away: match.awayScore ?? 0 }
    await db.insert(schema.probabilities).values(probabilityRows(match.id, home, away, referee, base, minute, score))
    computed++
  }
  return { matches: computed }
}
