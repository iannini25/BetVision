import type { ProviderMatch, ProviderEvent, ProviderLineup, ProviderOdds } from '../interface'
import type { SmFixture, SmParticipant, SmEvent, SmOdd, SmStatistic, SmLineupPlayer } from './types'
import { EVENT_TYPES, statusFromStateId, periodFromStateId } from './reference'
import { shortCode } from './normalize'

type StatKey = (typeId: number) => string | null

export function participant(f: SmFixture, location: 'home' | 'away'): SmParticipant | undefined {
  return f.participants?.find((p) => p.meta?.location === location)
}

// Single source of truth for a team's short code (also used by fetchTeams/odds) so the
// same team renders identically across matches, events, odds and the upserted row.
export function participantShort(p?: SmParticipant): string {
  if (!p) return ''
  return shortCode({ id: p.id, name: p.name, short_code: p.short_code })
}

/** Kickoff: prefer the unambiguous UNIX timestamp; else parse starting_at as UTC. */
function kickoff(f: SmFixture): Date {
  if (f.starting_at_timestamp) return new Date(f.starting_at_timestamp * 1000)
  if (f.starting_at) return new Date(f.starting_at.replace(' ', 'T') + 'Z')
  return new Date()
}

function currentScore(f: SmFixture): { home?: number; away?: number } {
  let home: number | undefined
  let away: number | undefined
  for (const s of f.scores ?? []) {
    if (s.description !== 'CURRENT') continue
    if (s.score?.participant === 'home') home = s.score.goals
    else if (s.score?.participant === 'away') away = s.score.goals
  }
  return { home, away }
}

function mapEvents(f: SmFixture): ProviderEvent[] {
  const teamShort = (id?: number | null) => (id == null ? '' : participantShort(f.participants?.find((p) => p.id === id)))
  return (f.events ?? [])
    .filter((e) => EVENT_TYPES[e.type_id])
    .slice()
    .sort((a, b) => (a.sort_order ?? a.minute ?? 0) - (b.sort_order ?? b.minute ?? 0))
    .map((e: SmEvent) => {
      const def = EVENT_TYPES[e.type_id]
      return {
        type: def.type,
        minute: e.minute ?? 0,
        team: teamShort(e.participant_id),
        player: e.player_name ?? undefined,
        // The type table owns the semantic detail (penalty/own/yellow/red); the free-text
        // `addition` (e.g. VAR result, "Goal Disallowed") only fills in where it has none.
        detail: def.detail ?? e.addition ?? undefined,
      }
    })
}

function mapStats(f: SmFixture, statKey: StatKey): Record<string, { home: number; away: number }> {
  const homeId = participant(f, 'home')?.id
  const awayId = participant(f, 'away')?.id
  const result: Record<string, { home: number; away: number }> = {}
  for (const s of f.statistics ?? ([] as SmStatistic[])) {
    const key = statKey(s.type_id)
    if (!key) continue
    const value = typeof s.data === 'number' ? s.data : s.data?.value
    if (value == null) continue
    // Resolve the side explicitly; if it can't be determined, omit rather than fabricate
    // a 'home'/'away' (the v3 API treats missing data as no-data, not zero).
    const side =
      s.location ??
      (homeId != null && s.participant_id === homeId
        ? 'home'
        : awayId != null && s.participant_id === awayId
          ? 'away'
          : undefined)
    if (!side) continue
    result[key] = result[key] ?? { home: 0, away: 0 }
    result[key][side] = value
  }
  return result
}

export function mapFixtureToMatch(f: SmFixture, statKey: StatKey): ProviderMatch {
  const home = participant(f, 'home')
  const away = participant(f, 'away')
  const score = currentScore(f)
  return {
    externalId: String(f.id),
    homeTeam: { name: home?.name ?? 'Home', shortName: participantShort(home) || 'HOM' },
    awayTeam: { name: away?.name ?? 'Away', shortName: participantShort(away) || 'AWY' },
    status: statusFromStateId(f.state_id),
    startTime: kickoff(f),
    venue: f.venue?.name ?? undefined,
    city: f.venue?.city_name ?? undefined,
    homeScore: score.home,
    awayScore: score.away,
    period: periodFromStateId(f.state_id),
    events: mapEvents(f),
    stats: mapStats(f, statKey),
  }
}

export function mapLineups(f: SmFixture): ProviderLineup[] {
  const byTeam = new Map<number, SmLineupPlayer[]>()
  for (const p of f.lineups ?? []) {
    if (p.team_id == null) continue
    const arr = byTeam.get(p.team_id) ?? []
    arr.push(p)
    byTeam.set(p.team_id, arr)
  }
  const formationOf = (id: number) => f.formations?.find((fm) => fm.participant_id === id)?.formation ?? undefined
  const nameOf = (id: number) => f.participants?.find((pp) => pp.id === id)?.name ?? 'Team'

  return [...byTeam.entries()].map(([teamId, players]) => ({
    teamName: nameOf(teamId),
    formation: formationOf(teamId),
    confirmed: true,
    players: players.map((pl) => ({ name: pl.player_name ?? 'Jogador', number: pl.jersey_number ?? undefined })),
  }))
}

// Sportmonks market_ids confirmed in the BetV study (mirrors reference.ts's named tables).
const MARKET = { WINNER_1X2: 1, BTTS: 14, OVER_UNDER: 80 } as const
const OU_LINE = '2.5'

const RESULT_1X2: Record<string, (home: string, away: string) => string> = {
  '1': (home) => `${home} vence`,
  X: () => 'Empate',
  '2': (_home, away) => `${away} vence`,
}

/**
 * Map Sportmonks odds to the internal markets the model also computes (so the value
 * engine can pair them): 1X2 (winner), BTTS, and Over/Under 2.5. Other markets are
 * skipped — the model has no probability to compare them against.
 */
export function mapOdds(odds: SmOdd[], ctx: { homeShort: string; awayShort: string }): ProviderOdds[] {
  const out: ProviderOdds[] = []
  for (const o of odds ?? []) {
    const value = parseFloat(o.value ?? '')
    if (!Number.isFinite(value)) continue
    const bookmaker = o.bookmaker?.name ?? `book-${o.bookmaker_id ?? '?'}`
    const label = (o.label ?? o.name ?? '').toString().trim()

    if (o.market_id === MARKET.WINNER_1X2) {
      const make = RESULT_1X2[label]
      if (make) out.push({ bookmaker, market: 'winner', outcome: make(ctx.homeShort, ctx.awayShort), odds: value })
    } else if (o.market_id === MARKET.BTTS) {
      const outcome = /yes/i.test(label) ? 'Sim' : /no/i.test(label) ? 'Não' : null
      if (outcome) out.push({ bookmaker, market: 'btts', outcome, odds: value })
    } else if (o.market_id === MARKET.OVER_UNDER && o.total === OU_LINE) {
      const outcome = /over/i.test(label) ? `Over ${OU_LINE}` : /under/i.test(label) ? `Under ${OU_LINE}` : null
      if (outcome) out.push({ bookmaker, market: 'over_under_2_5', outcome, odds: value })
    }
  }
  return out
}
