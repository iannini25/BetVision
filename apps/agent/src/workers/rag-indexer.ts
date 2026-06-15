import { inArray } from 'drizzle-orm'
import { db, schema, pool } from '../lib/db'
import { indexContent } from '../rag/indexer'

/**
 * Index fresh material into rag_chunks for the chat's retrieval context:
 *  - news items not yet indexed
 *  - goal events from live/finished matches (so queries like "brasil gol" hit)
 * Dedup is by exact content so repeated runs are idempotent and bounded.
 */
export async function runRagIndexer(): Promise<Record<string, unknown>> {
  const news = await indexNews()
  const goals = await indexGoals()
  return { newsIndexed: news, goalsIndexed: goals }
}

async function indexNews(): Promise<number> {
  const items = await db
    .select({ id: schema.newsItems.id, matchId: schema.newsItems.matchId, title: schema.newsItems.title, summary: schema.newsItems.summary })
    .from(schema.newsItems)
  let indexed = 0
  for (const item of items) {
    const content = item.summary ? `${item.title} ${item.summary}` : item.title
    if (await alreadyIndexed(content)) continue
    await indexContent(content, { newsId: item.id }, item.matchId ?? undefined, 'news')
    indexed++
  }
  return indexed
}

async function indexGoals(): Promise<number> {
  const matches = await db
    .select({ id: schema.matches.id, events: schema.matches.events, homeTeamId: schema.matches.homeTeamId, awayTeamId: schema.matches.awayTeamId })
    .from(schema.matches)
    .where(inArray(schema.matches.status, ['live', 'finished']))

  let indexed = 0
  for (const match of matches) {
    const goals = (match.events ?? []).filter((e) => e.type === 'goal')
    for (const goal of goals) {
      const content = `Gol de ${goal.team || 'time'} aos ${goal.minute}' (${goal.player || 'jogador'}).`
      if (await alreadyIndexed(content)) continue
      await indexContent(content, { matchId: match.id, minute: goal.minute }, match.id, 'event')
      indexed++
    }
  }
  return indexed
}

async function alreadyIndexed(content: string): Promise<boolean> {
  const res = await pool.query(`SELECT 1 FROM rag_chunks WHERE content = $1 LIMIT 1`, [content])
  return (res.rowCount ?? 0) > 0
}
