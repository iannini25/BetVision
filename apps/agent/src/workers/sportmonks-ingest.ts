import { eq } from 'drizzle-orm'
import { db, schema } from '../lib/db'
import { logger } from '../lib/logger'
import type { DataProvider, ProviderMatch } from '../providers'
import { matchTeam, type TeamLike } from '../providers/sportmonks/normalize'

/**
 * Upserts Sportmonks data into the internal schema, idempotently by externalId.
 * Only invoked in sportmonks mode (the mock path never reaches here), so the mock
 * behaviour is untouched. All ID/name reconciliation lives here, not in the provider.
 */

type TeamRow = TeamLike

// Resolves provider teams to internal team rows, keeping an in-memory cache to avoid
// re-querying per fixture; matches by externalId, then short_code, then alias/name.
class TeamResolver {
  constructor(private rows: TeamRow[]) {}

  static async load(): Promise<TeamResolver> {
    const rows = await db
      .select({ id: schema.teams.id, externalId: schema.teams.externalId, name: schema.teams.name, shortName: schema.teams.shortName })
      .from(schema.teams)
    return new TeamResolver(rows)
  }

  async resolve(input: { externalId?: string; name: string; shortName: string; group?: string }): Promise<number> {
    const smId = input.externalId ? Number(input.externalId) : 0
    const existing = matchTeam(this.rows, { id: smId, name: input.name, short_code: input.shortName })
    if (existing) {
      if (input.externalId && existing.externalId !== input.externalId) {
        await db.update(schema.teams).set({ externalId: input.externalId }).where(eq(schema.teams.id, existing.id))
        existing.externalId = input.externalId
      }
      return existing.id
    }
    const [row] = await db
      .insert(schema.teams)
      .values({ externalId: input.externalId, name: input.name, shortName: input.shortName, group: input.group })
      .returning({ id: schema.teams.id })
    this.rows.push({ id: row.id, externalId: input.externalId ?? null, name: input.name, shortName: input.shortName })
    return row.id
  }
}

async function upsertReferee(provider: DataProvider, externalId: string): Promise<number | undefined> {
  const ref = await provider.fetchMatchReferee(externalId)
  if (!ref) return undefined
  const [byExt] = await db.select({ id: schema.referees.id }).from(schema.referees).where(eq(schema.referees.externalId, ref.externalId)).limit(1)
  const values = {
    externalId: ref.externalId,
    name: ref.name,
    country: ref.country,
    avgYellows: ref.avgYellows,
    avgReds: ref.avgReds,
    avgFouls: ref.avgFouls,
    penaltyRate: ref.penaltyRate,
  }
  if (byExt) {
    await db.update(schema.referees).set(values).where(eq(schema.referees.id, byExt.id))
    return byExt.id
  }
  const [row] = await db.insert(schema.referees).values(values).returning({ id: schema.referees.id })
  return row.id
}

async function upsertMatch(m: ProviderMatch, homeId: number, awayId: number, refereeId?: number): Promise<'inserted' | 'updated'> {
  const base = {
    homeTeamId: homeId,
    awayTeamId: awayId,
    refereeId: refereeId ?? null,
    status: m.status,
    phase: m.phase,
    group: m.group,
    venue: m.venue,
    city: m.city,
    iniciaEm: m.startTime,
    homeScore: m.homeScore ?? null,
    awayScore: m.awayScore ?? null,
    minute: m.minute ?? null,
    period: m.period,
    events: m.events ?? [],
    stats: m.stats ?? {},
    atualizadoEm: new Date(),
  }
  const [existing] = await db.select({ id: schema.matches.id }).from(schema.matches).where(eq(schema.matches.externalId, m.externalId)).limit(1)
  if (existing) {
    await db.update(schema.matches).set(base).where(eq(schema.matches.id, existing.id))
    return 'updated'
  }
  await db.insert(schema.matches).values({ externalId: m.externalId, ...base })
  return 'inserted'
}

/** Sync squads (teams + player roster), then today's fixtures + referees. */
export async function ingestFixtures(provider: DataProvider): Promise<Record<string, unknown>> {
  const teamResolver = await TeamResolver.load()

  // Squads first (when supported), so player profiles have real rosters.
  let teamsSynced = 0
  if (provider.fetchTeams) {
    const teams = await provider.fetchTeams()
    for (const t of teams) {
      const teamId = await teamResolver.resolve({ externalId: t.externalId, name: t.name, shortName: t.shortName, group: t.group })
      teamsSynced++
      await upsertPlayers(teamId, t.players ?? [])
    }
  }

  const fixtures = await provider.fetchTodayMatches()
  let inserted = 0
  let updated = 0
  for (const f of fixtures) {
    const homeId = await teamResolver.resolve({ name: f.homeTeam.name, shortName: f.homeTeam.shortName })
    const awayId = await teamResolver.resolve({ name: f.awayTeam.name, shortName: f.awayTeam.shortName })
    const refereeId = await upsertReferee(provider, f.externalId)
    const outcome = await upsertMatch(f, homeId, awayId, refereeId)
    outcome === 'inserted' ? inserted++ : updated++
  }

  logger.info({ teamsSynced, inserted, updated }, 'sportmonks fixtures ingested')
  return { provider: provider.name, teamsSynced, fixturesInserted: inserted, fixturesUpdated: updated }
}

async function upsertPlayers(teamId: number, players: { externalId: string; name: string; position?: string; stats?: Record<string, number> }[]): Promise<void> {
  for (const p of players) {
    if (!p.externalId) continue
    const [byExt] = await db.select({ id: schema.players.id }).from(schema.players).where(eq(schema.players.externalId, p.externalId)).limit(1)
    const values = { externalId: p.externalId, name: p.name, teamId, position: p.position, stats: p.stats ?? {} }
    if (byExt) await db.update(schema.players).set(values).where(eq(schema.players.id, byExt.id))
    else await db.insert(schema.players).values(values)
  }
}

/** Poll live matches and refresh score/events/stats/status (fires pg_notify via the trigger). */
export async function ingestLive(provider: DataProvider): Promise<Record<string, unknown>> {
  if (!provider.fetchLiveMatches) return { note: 'provider has no fetchLiveMatches' }
  const live = await provider.fetchLiveMatches()
  let updated = 0
  for (const m of live) {
    const [existing] = await db.select({ id: schema.matches.id }).from(schema.matches).where(eq(schema.matches.externalId, m.externalId)).limit(1)
    if (!existing) continue // fixtures-sync owns creation; live only refreshes known matches
    await db
      .update(schema.matches)
      .set({
        status: m.status,
        homeScore: m.homeScore ?? null,
        awayScore: m.awayScore ?? null,
        minute: m.minute ?? null,
        period: m.period,
        events: m.events ?? [],
        stats: m.stats ?? {},
        atualizadoEm: new Date(),
      })
      .where(eq(schema.matches.id, existing.id))
    updated++
  }
  return { provider: provider.name, liveUpdated: updated }
}
