import { asc, eq } from 'drizzle-orm'
import { round2 } from '@betv/shared'
import { db, schema, type MatchEvent } from '../lib/db'
import {
  calculateMatchProbabilities,
  calculateCornerProbabilities,
  calculateCardProbabilities,
  calculateVarProbabilities,
  type MatchProbabilities,
} from '../engine'

const FULL_TIME = 90
// Live simulation tuning (mock). Per tick: clock step and cumulative event-roll thresholds.
const MINUTE_STEP_BASE = 1
const MINUTE_STEP_JITTER = 2
const EVENT_ODDS = { goal: 0.12, card: 0.3, var: 0.36, corner: 0.5 }
const RESULT_LOCK_AT_FULL_TIME = 0.85
const DEFAULT_ELO = 1800
const DEFAULT_CORNER_AVG = { home: 5.2, away: 4.8 }
const DEFAULT_REFEREE = { avgYellows: 4, rigidity: 50, penaltyRate: 0.3, teamYellowAvg: 2 }

type TeamRow = typeof schema.teams.$inferSelect
type MatchRow = typeof schema.matches.$inferSelect
type Score = { home: number; away: number }
type Stats = Record<string, Score>

/**
 * Each tick: guarantee one live match exists, advance its clock/score/events,
 * recompute probabilities through the deterministic engine, and persist.
 * The UPDATE on matches and INSERT on probabilities fire pg_notify('betv_updates'),
 * which the realtime service fans out — this is what makes the dashboard move with no keys.
 */
export async function runLiveEngine(): Promise<Record<string, unknown>> {
  const match = (await currentLiveMatch()) ?? (await kickoffNextMatch())
  if (!match) return { note: 'no matches available to simulate' }
  return advance(match)
}

async function currentLiveMatch(): Promise<MatchRow | undefined> {
  const [m] = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.status, 'live'))
    .orderBy(asc(schema.matches.id))
    .limit(1)
  return m
}

// No live match: promote the next scheduled one (or recycle the oldest) so motion never stops.
async function kickoffNextMatch(): Promise<MatchRow | undefined> {
  const [scheduled] = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.status, 'scheduled'))
    .orderBy(asc(schema.matches.iniciaEm))
    .limit(1)
  const candidate =
    scheduled ??
    (await db.select().from(schema.matches).orderBy(asc(schema.matches.atualizadoEm)).limit(1))[0]
  if (!candidate) return undefined

  const [m] = await db
    .update(schema.matches)
    .set({
      status: 'live',
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      period: '1st_half',
      events: [],
      stats: initialStats(),
      atualizadoEm: new Date(),
    })
    .where(eq(schema.matches.id, candidate.id))
    .returning()
  return m
}

async function advance(match: MatchRow): Promise<Record<string, unknown>> {
  const home = await teamById(match.homeTeamId)
  const away = await teamById(match.awayTeamId)
  const referee = await refereeById(match.refereeId)

  const minute = Math.min(FULL_TIME, (match.minute ?? 0) + MINUTE_STEP_BASE + Math.floor(Math.random() * MINUTE_STEP_JITTER))
  const score: Score = { home: match.homeScore ?? 0, away: match.awayScore ?? 0 }
  const events: MatchEvent[] = [...(match.events ?? [])]
  const stats: Stats = { ...initialStats(), ...(match.stats ?? {}) }

  const base = baseProbabilities(home, away)

  applyTickEvent({ minute, score, events, stats, base, home, away })
  driftPossession(stats)

  const status = minute >= FULL_TIME ? 'finished' : 'live'
  const period = minute > 45 ? '2nd_half' : '1st_half'

  await db.insert(schema.probabilities).values(probabilityRows(match.id, home, away, referee, base, minute, score))
  await db
    .update(schema.matches)
    .set({ minute, homeScore: score.home, awayScore: score.away, events, stats, status, period, atualizadoEm: new Date() })
    .where(eq(schema.matches.id, match.id))

  return {
    matchId: match.id,
    fixture: `${home?.shortName ?? '?'} ${score.home}-${score.away} ${away?.shortName ?? '?'}`,
    minute,
    status,
  }
}

type TickContext = {
  minute: number
  score: Score
  events: MatchEvent[]
  stats: Stats
  base: MatchProbabilities
  home?: TeamRow
  away?: TeamRow
}

// One event per tick (or none), weighted so goals follow the model's relative strength.
function applyTickEvent(ctx: TickContext): void {
  const { minute, score, events, stats, base, home, away } = ctx
  const roll = Math.random()
  if (roll < EVENT_ODDS.goal) {
    const homeScores = Math.random() < base.homeWin / (base.homeWin + base.awayWin || 1)
    const side = homeScores ? 'home' : 'away'
    score[side] += 1
    bump(stats, 'shots', side)
    bump(stats, 'shotsOnTarget', side)
    events.push({ type: 'goal', minute, team: shortOf(homeScores ? home : away), player: '—' })
  } else if (roll < EVENT_ODDS.card) {
    const homeSide = Math.random() < 0.5
    events.push({ type: 'card', minute, team: shortOf(homeSide ? home : away), player: '—', detail: 'yellow' })
  } else if (roll < EVENT_ODDS.var) {
    events.push({ type: 'var', minute, team: '', detail: 'Checagem do VAR' })
  } else if (roll < EVENT_ODDS.corner) {
    const side = Math.random() < 0.5 ? 'home' : 'away'
    bump(stats, 'corners', side)
    events.push({ type: 'corner', minute, team: shortOf(side === 'home' ? home : away) })
  }
}

// Blend pre-match probabilities with the live state: a lead locks in as time runs out;
// over/btts are pinned by goals already scored. Deterministic given (minute, score).
function liveAdjust(base: MatchProbabilities, minute: number, score: Score) {
  const t = Math.min(1, minute / FULL_TIME)
  const lock = RESULT_LOCK_AT_FULL_TIME * t
  const lead = score.home - score.away

  let homeWin = base.homeWin
  let draw = base.draw
  let awayWin = base.awayWin

  if (lead > 0) {
    homeWin += (1 - homeWin) * lock * Math.min(1, lead / 2)
    draw *= 1 - lock
    awayWin = Math.max(0.01, 1 - homeWin - draw)
  } else if (lead < 0) {
    awayWin += (1 - awayWin) * lock * Math.min(1, -lead / 2)
    draw *= 1 - lock
    homeWin = Math.max(0.01, 1 - awayWin - draw)
  } else {
    draw += (1 - draw) * lock * 0.5
    const remaining = 1 - draw
    const sides = homeWin + awayWin || 1
    homeWin = remaining * (homeWin / sides)
    awayWin = remaining * (awayWin / sides)
  }

  const sum = homeWin + draw + awayWin || 1
  const total = score.home + score.away
  return {
    homeWin: homeWin / sum,
    draw: draw / sum,
    awayWin: awayWin / sum,
    over25: total > 2 ? 0.99 : Math.max(0.02, base.over2_5 * (1 - t)),
    btts: score.home > 0 && score.away > 0 ? 0.99 : Math.max(0.02, base.btts * (1 - t)),
  }
}

type RefereeRow = typeof schema.referees.$inferSelect

// Deterministic pre-match base probabilities for a fixture (no live state).
export function baseProbabilities(home: TeamRow | undefined, away: TeamRow | undefined): MatchProbabilities {
  return calculateMatchProbabilities({
    homeElo: home?.elo ?? DEFAULT_ELO,
    awayElo: away?.elo ?? DEFAULT_ELO,
    homeForm: home?.form ?? [],
    awayForm: away?.form ?? [],
    isNeutralVenue: true,
  })
}

// Full probability row set for a match given its (real or simulated) minute/score.
// Shared by the mock live-engine and the production probabilities worker, so both
// emit identical (market, outcome) keys — which the value engine pairs against odds.
export function probabilityRows(
  matchId: number,
  home: TeamRow | undefined,
  away: TeamRow | undefined,
  referee: RefereeRow | undefined,
  base: MatchProbabilities,
  minute: number,
  score: Score
) {
  const live = liveAdjust(base, minute, score)
  const corners = calculateCornerProbabilities({
    homeExpectedGoals: base.homeExpectedGoals,
    awayExpectedGoals: base.awayExpectedGoals,
    homeCornerAvg: DEFAULT_CORNER_AVG.home,
    awayCornerAvg: DEFAULT_CORNER_AVG.away,
  })
  const cards = calculateCardProbabilities({
    refereeAvgYellows: referee?.avgYellows ?? DEFAULT_REFEREE.avgYellows,
    refereeRigidity: referee?.rigidity ?? DEFAULT_REFEREE.rigidity,
    isKnockout: false,
    homeYellowAvg: DEFAULT_REFEREE.teamYellowAvg,
    awayYellowAvg: DEFAULT_REFEREE.teamYellowAvg,
  })
  const varp = calculateVarProbabilities({
    refereePenaltyRate: referee?.penaltyRate ?? DEFAULT_REFEREE.penaltyRate,
    homeExpectedGoals: base.homeExpectedGoals,
    awayExpectedGoals: base.awayExpectedGoals,
    isKnockout: false,
  })
  return liveProbRows(matchId, home, away, live, corners, cards, varp)
}

function liveProbRows(
  matchId: number,
  home: TeamRow | undefined,
  away: TeamRow | undefined,
  live: ReturnType<typeof liveAdjust>,
  corners: ReturnType<typeof calculateCornerProbabilities>,
  cards: ReturnType<typeof calculateCardProbabilities>,
  varp: ReturnType<typeof calculateVarProbabilities>
) {
  const H = shortOf(home)
  const A = shortOf(away)
  return [
    probRow(matchId, 'winner', `${H} vence`, live.homeWin),
    probRow(matchId, 'winner', 'Empate', live.draw),
    probRow(matchId, 'winner', `${A} vence`, live.awayWin),
    probRow(matchId, 'over_under_2_5', 'Over 2.5', live.over25),
    probRow(matchId, 'btts', 'Sim', live.btts),
    probRow(matchId, 'corners_over_9_5', 'Over 9.5', corners.over9_5),
    probRow(matchId, 'cards_over_4_5', 'Over 4.5', cards.over4_5),
    probRow(matchId, 'var_penalty', 'Pênalti', varp.penalty),
  ]
}

function probRow(matchId: number, market: string, outcome: string, probability: number) {
  return { matchId, market, outcome, probability: round2(probability), isLive: true }
}

export async function teamById(id: number | null): Promise<TeamRow | undefined> {
  if (!id) return undefined
  const [t] = await db.select().from(schema.teams).where(eq(schema.teams.id, id)).limit(1)
  return t
}

export async function refereeById(id: number | null) {
  if (!id) return undefined
  const [r] = await db.select().from(schema.referees).where(eq(schema.referees.id, id)).limit(1)
  return r
}

function shortOf(team?: TeamRow): string {
  return team?.shortName ?? ''
}

function bump(stats: Stats, key: string, side: keyof Score): void {
  stats[key] = stats[key] ?? { home: 0, away: 0 }
  stats[key][side] += 1
}

function driftPossession(stats: Stats): void {
  const home = stats.possession?.home ?? 50
  const next = Math.max(35, Math.min(65, home + Math.round((Math.random() - 0.5) * 4)))
  stats.possession = { home: next, away: 100 - next }
}

function initialStats(): Stats {
  return {
    possession: { home: 50, away: 50 },
    shots: { home: 0, away: 0 },
    shotsOnTarget: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
  }
}
