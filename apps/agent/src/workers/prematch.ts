import { eq } from 'drizzle-orm'
import { db, schema } from '../lib/db'
import { createDataProvider } from '../providers'

/**
 * For matches still scheduled, ensure lineups are present (probable -> confirmed).
 * Mock lineups come from the provider; missing ones are inserted as confirmed.
 */
export async function runPrematch(): Promise<Record<string, unknown>> {
  const provider = createDataProvider()
  const scheduled = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.status, 'scheduled'))

  let lineupsAdded = 0
  for (const match of scheduled) {
    const existing = await db
      .select({ id: schema.lineups.id })
      .from(schema.lineups)
      .where(eq(schema.lineups.matchId, match.id))
      .limit(1)
    if (existing.length > 0 || !match.externalId) continue

    const lineups = await provider.fetchLineups(match.externalId)
    for (const lineup of lineups) {
      const teamId = await teamIdByName(lineup.teamName)
      if (!teamId) continue
      await db.insert(schema.lineups).values({
        matchId: match.id,
        teamId,
        formation: lineup.formation,
        confirmed: lineup.confirmed,
        players: lineup.players,
      })
      lineupsAdded++
    }
  }

  return { scheduled: scheduled.length, lineupsAdded }
}

async function teamIdByName(name: string): Promise<number | undefined> {
  const [team] = await db
    .select({ id: schema.teams.id })
    .from(schema.teams)
    .where(eq(schema.teams.name, name))
    .limit(1)
  return team?.id
}
