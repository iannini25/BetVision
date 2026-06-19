// Pure, framework-free helpers for the Match Center. Kept out of components so the
// shaping logic stays testable and the panels read as plain rendering.

import { TIMEZONE_BR } from '@betv/shared'

const MS_PER_MINUTE = 1000 * 60

export type MatchEventLike = { type: string; minute: number; team?: string; player?: string; detail?: string }

const EVENT_LABELS: Record<string, string> = {
  goal: 'GOL', card: 'CARTÃO', var: 'VAR', corner: 'ESCANTEIO', substitution: 'SUBSTITUIÇÃO',
}

/** Short, colored label for a match event (ticker chip / timeline tag). */
export function eventShortLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.toUpperCase()
}

/** Human description of an event, without the leading label. Shared by the Match
 * Center timeline and the dashboard live ticker so both read the same. */
export function eventDescription(e: MatchEventLike): string {
  const who = [e.player, e.team ? `(${e.team})` : null].filter(Boolean).join(' ')
  switch (e.type) {
    case 'goal': return who || 'Gol'
    case 'card': return `${e.detail === 'red' ? 'vermelho' : 'amarelo'} · ${who}`.trim()
    case 'var': return e.detail ?? 'checagem'
    case 'corner': return e.team || 'escanteio'
    case 'substitution': return e.team || 'substituição'
    default: return e.detail ?? e.type
  }
}

/** "há 12 min" / "há 2 h" / "há 3 d" from a timestamp, for the agent feed. */
export function relativeTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.max(0, Math.round((Date.now() - then) / MS_PER_MINUTE))
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  return `há ${Math.round(hours / 24)} d`
}

/** Kickoff time rendered in Brasília time. Store UTC, convert only at the display edge. */
export function formatBrtTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE_BR,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateStr))
  } catch {
    return '--:--'
  }
}

export type MatchPhase = 'pre' | 'live' | 'finished'

const LIVE_STATUSES = new Set(['live', 'halftime', 'inplay', '1st_half', '2nd_half'])
const FINISHED_STATUSES = new Set(['finished', 'aet', 'ft_pen', 'awarded'])

export function matchPhase(status: string | null | undefined): MatchPhase {
  if (status && FINISHED_STATUSES.has(status)) return 'finished'
  if (status && LIVE_STATUSES.has(status)) return 'live'
  return 'pre'
}

export type ProbRow = { market: string; outcome: string; probability: number }

/**
 * The probabilities table is append-only (one row per recalculation), ordered newest
 * first by the API. This keeps only the most recent value per (market, outcome).
 */
export function latestProbabilities(rows: ProbRow[]): ProbRow[] {
  const seen = new Set<string>()
  const latest: ProbRow[] = []
  for (const row of rows) {
    const key = `${row.market}|${row.outcome}`
    if (seen.has(key)) continue
    seen.add(key)
    latest.push(row)
  }
  return latest
}

/** Find one probability by market + (optional) outcome among already-deduped rows. */
export function findProb(rows: ProbRow[], market: string, outcome?: string): ProbRow | undefined {
  return rows.find((r) => r.market === market && (outcome === undefined || r.outcome === outcome))
}

export type OddRow = { market: string; outcome: string; bookmaker: string; odds: number }
export type OutcomeOdds = { outcome: string; best: { bookmaker: string; odds: number }; quotes: { bookmaker: string; odds: number }[] }
export type MarketOdds = { market: string; outcomes: OutcomeOdds[] }

/**
 * Groups raw odds snapshots into markets -> outcomes -> per-bookmaker quotes,
 * marking the best (highest) odd per outcome. The odds table lists every house
 * without prioritising any (product rule C10.5); "best" is purely the max value.
 */
export function groupOddsByMarket(rows: OddRow[]): MarketOdds[] {
  const byMarket = new Map<string, Map<string, { bookmaker: string; odds: number }[]>>()

  for (const row of rows) {
    if (!byMarket.has(row.market)) byMarket.set(row.market, new Map())
    const outcomes = byMarket.get(row.market)!
    if (!outcomes.has(row.outcome)) outcomes.set(row.outcome, [])
    const quotes = outcomes.get(row.outcome)!
    // Snapshots are append-only; keep only the latest quote per bookmaker (first seen,
    // since the API returns newest first).
    if (!quotes.some((q) => q.bookmaker === row.bookmaker)) {
      quotes.push({ bookmaker: row.bookmaker, odds: row.odds })
    }
  }

  return [...byMarket.entries()].map(([market, outcomes]) => ({
    market,
    outcomes: [...outcomes.entries()].map(([outcome, quotes]) => ({
      outcome,
      best: quotes.reduce((a, b) => (b.odds > a.odds ? b : a)),
      quotes,
    })),
  }))
}
