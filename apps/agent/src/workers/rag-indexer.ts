import { and, eq, gt, inArray } from 'drizzle-orm'
import { db, schema, pool } from '../lib/db'
import { indexContent } from '../rag/indexer'

type Cursor = { lastNewsId: number; lastMatchAt: string }

/**
 * Index fresh material into rag_chunks for the chat's retrieval context:
 *  - news items added since the last run (by id watermark)
 *  - goal events from non-archived live/finished matches changed since the last run
 * Incremental via a cursor in this worker's own system_health.metadata (the scheduler
 * rewrites it from our return value). Dedup by exact content is kept as a safety net,
 * so a still-live match re-scanned on an update never double-indexes its earlier goals.
 */
export async function runRagIndexer(): Promise<Record<string, unknown>> {
  const cursor = await readCursor()
  const news = await indexNews(cursor)
  const goals = await indexGoals(cursor)
  return {
    newsIndexed: news.indexed,
    goalsIndexed: goals.indexed,
    lastNewsId: news.lastNewsId,
    lastMatchAt: goals.lastMatchAt,
  }
}

async function readCursor(): Promise<Cursor> {
  const res = await pool.query(`SELECT metadata FROM system_health WHERE worker = 'rag-indexer' LIMIT 1`)
  const meta = (res.rows[0]?.metadata ?? {}) as Record<string, unknown>
  return {
    lastNewsId: typeof meta.lastNewsId === 'number' ? meta.lastNewsId : 0,
    lastMatchAt: typeof meta.lastMatchAt === 'string' ? meta.lastMatchAt : new Date(0).toISOString(),
  }
}

async function indexNews(cursor: Cursor): Promise<{ indexed: number; lastNewsId: number }> {
  const items = await db
    .select({ id: schema.newsItems.id, matchId: schema.newsItems.matchId, title: schema.newsItems.title, summary: schema.newsItems.summary })
    .from(schema.newsItems)
    .where(gt(schema.newsItems.id, cursor.lastNewsId))
    .orderBy(schema.newsItems.id)

  let indexed = 0
  let lastNewsId = cursor.lastNewsId
  for (const item of items) {
    lastNewsId = Math.max(lastNewsId, item.id)
    const content = item.summary ? `${item.title} ${item.summary}` : item.title
    if (await alreadyIndexed(content)) continue
    await indexContent(content, { newsId: item.id }, item.matchId ?? undefined, 'news')
    indexed++
  }
  return { indexed, lastNewsId }
}

async function indexGoals(cursor: Cursor): Promise<{ indexed: number; lastMatchAt: string }> {
  const since = new Date(cursor.lastMatchAt)
  const matches = await db
    .select({ id: schema.matches.id, events: schema.matches.events, atualizadoEm: schema.matches.atualizadoEm })
    .from(schema.matches)
    .where(
      and(
        eq(schema.matches.archived, false),
        inArray(schema.matches.status, ['live', 'finished']),
        gt(schema.matches.atualizadoEm, since)
      )
    )

  let indexed = 0
  let lastMatchAt = cursor.lastMatchAt
  for (const match of matches) {
    const updatedAt = match.atualizadoEm?.toISOString()
    if (updatedAt && updatedAt > lastMatchAt) lastMatchAt = updatedAt
    const goals = (match.events ?? []).filter((e) => e.type === 'goal')
    for (const goal of goals) {
      const content = `Gol de ${goal.team || 'time'} aos ${goal.minute}' (${goal.player || 'jogador'}).`
      if (await alreadyIndexed(content)) continue
      await indexContent(content, { matchId: match.id, minute: goal.minute }, match.id, 'event')
      indexed++
    }
  }
  return { indexed, lastMatchAt }
}

async function alreadyIndexed(content: string): Promise<boolean> {
  const res = await pool.query(`SELECT 1 FROM rag_chunks WHERE content = $1 LIMIT 1`, [content])
  return (res.rowCount ?? 0) > 0
}
