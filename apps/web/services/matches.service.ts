import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { round3 } from '@betv/shared'
import { db, schema } from '@/lib/db'
const {
  matches, teams, referees, probabilities, oddsSnapshots,
  valueFlags, newsItems, lineups, predictionsLog, aiAnalyses,
} = schema

export async function getTodayMatches() {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const result = await db
    .select()
    .from(matches)
    .innerJoin(teams, eq(matches.homeTeamId, teams.id))
    .where(
      and(
        gte(matches.iniciaEm, today),
        lte(matches.iniciaEm, tomorrow),
        eq(matches.archived, false)
      )
    )
    .orderBy(
      sql`CASE WHEN ${matches.status} = 'live' THEN 0 ELSE 1 END`,
      matches.iniciaEm
    )

  // Build full match data with both teams
  const matchIds = result.map((r) => r.matches.id)
  if (matchIds.length === 0) return []

  const allMatches = await db.select().from(matches).where(
    sql`${matches.id} IN (${sql.join(matchIds.map(id => sql`${id}`), sql`, `)})`
  )

  const teamIds = new Set<number>()
  allMatches.forEach((m) => {
    if (m.homeTeamId) teamIds.add(m.homeTeamId)
    if (m.awayTeamId) teamIds.add(m.awayTeamId)
  })

  const allTeams = teamIds.size > 0
    ? await db.select().from(teams).where(
        sql`${teams.id} IN (${sql.join([...teamIds].map(id => sql`${id}`), sql`, `)})`
      )
    : []

  const teamMap = new Map(allTeams.map((t) => [t.id, t]))

  return allMatches.map((m) => ({
    ...m,
    homeTeam: teamMap.get(m.homeTeamId!) ?? null,
    awayTeam: teamMap.get(m.awayTeamId!) ?? null,
  }))
}

export async function getMatchById(id: number) {
  const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1)
  if (!match) return null

  const [homeTeam, awayTeam, referee] = await Promise.all([
    match.homeTeamId ? db.select().from(teams).where(eq(teams.id, match.homeTeamId)).then(r => r[0]) : null,
    match.awayTeamId ? db.select().from(teams).where(eq(teams.id, match.awayTeamId)).then(r => r[0]) : null,
    match.refereeId ? db.select().from(referees).where(eq(referees.id, match.refereeId)).then(r => r[0]) : null,
  ])

  return { ...match, homeTeam, awayTeam, referee }
}

export async function getMatchProbabilities(matchId: number) {
  return db
    .select()
    .from(probabilities)
    .where(eq(probabilities.matchId, matchId))
    .orderBy(desc(probabilities.calculadoEm))
}

export async function getMatchOdds(matchId: number) {
  return db
    .select()
    .from(oddsSnapshots)
    .where(eq(oddsSnapshots.matchId, matchId))
    .orderBy(desc(oddsSnapshots.capturedAt))
}

export async function getMatchLineups(matchId: number) {
  return db
    .select()
    .from(lineups)
    .where(eq(lineups.matchId, matchId))
}

export async function getMatchNews(matchId: number) {
  return db
    .select()
    .from(newsItems)
    .where(eq(newsItems.matchId, matchId))
    .orderBy(desc(newsItems.relevance))
}

export async function getMatchAnalysis(matchId: number) {
  return db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.matchId, matchId))
    .orderBy(desc(aiAnalyses.criadoEm))
}

// Global agent feed: latest classified news across all matches (relevance >= floor),
// independent of any single match. Powers the dashboard's "Últimas do agente".
export async function getAgentFeed(minRelevance = 3, limit = 12) {
  // Coalesce to criadoEm (NOT NULL) so undated items fall back to their insert time
  // instead of Postgres' default DESC NULLS FIRST floating them to the top.
  return db
    .select()
    .from(newsItems)
    .where(gte(newsItems.relevance, minRelevance))
    .orderBy(desc(sql`coalesce(${newsItems.publishedAt}, ${newsItems.criadoEm})`))
    .limit(limit)
}

export async function getValueRadar() {
  const flags = await db
    .select()
    .from(valueFlags)
    .where(eq(valueFlags.active, true))
    .orderBy(desc(valueFlags.edge))
    .limit(10)

  const matchIds = [...new Set(flags.map((f) => f.matchId))]
  if (matchIds.length === 0) return []

  const flagMatches = await db.select().from(matches).where(
    sql`${matches.id} IN (${sql.join(matchIds.map(id => sql`${id}`), sql`, `)})`
  )

  const teamIds = new Set<number>()
  flagMatches.forEach((m) => {
    if (m.homeTeamId) teamIds.add(m.homeTeamId)
    if (m.awayTeamId) teamIds.add(m.awayTeamId)
  })

  const allTeams = teamIds.size > 0
    ? await db.select().from(teams).where(
        sql`${teams.id} IN (${sql.join([...teamIds].map(id => sql`${id}`), sql`, `)})`
      )
    : []

  const teamMap = new Map(allTeams.map((t) => [t.id, t]))
  const matchMap = new Map(flagMatches.map((m) => [m.id, m]))

  // Finished/archived matches keep active value flags (odds-sync skips finished games
  // and never deactivates them), so drop them here — the Radar only shows live/upcoming.
  return flags
    .filter((f) => {
      const match = matchMap.get(f.matchId)
      return match && match.status !== 'finished' && !match.archived
    })
    .map((f) => {
      const match = matchMap.get(f.matchId)
      return {
        ...f,
        status: match?.status ?? null,
        homeTeam: match?.homeTeamId ? teamMap.get(match.homeTeamId) : null,
        awayTeam: match?.awayTeamId ? teamMap.get(match.awayTeamId) : null,
      }
    })
}

export async function getModelPerformance() {
  const preds = await db
    .select()
    .from(predictionsLog)
    .where(sql`${predictionsLog.actualResult} IS NOT NULL`)
    .orderBy(desc(predictionsLog.resolvedAt))

  const total = preds.length
  const correct = preds.filter((p) => p.actualResult).length
  const avgBrier = preds.reduce((sum, p) => sum + (p.brierScore ?? 0), 0) / (total || 1)

  const byMarket = preds.reduce<Record<string, { total: number; correct: number }>>((acc, p) => {
    if (!acc[p.market]) acc[p.market] = { total: 0, correct: 0 }
    acc[p.market].total++
    if (p.actualResult) acc[p.market].correct++
    return acc
  }, {})

  return {
    totalPredictions: total,
    accuracy: total > 0 ? correct / total : 0,
    brierScore: round3(avgBrier),
    byMarket: Object.entries(byMarket).map(([market, data]) => ({
      market,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
      total: data.total,
    })),
    recentPredictions: preds.slice(0, 10),
  }
}
