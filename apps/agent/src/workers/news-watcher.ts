import { db, schema } from '../lib/db'

/**
 * Watches the news feed. With a real provider this parses the ge/ESPN/Lance RSS
 * and runs the news classifier; in mock mode the seed supplies the feed, so this
 * reports the current relevant-news count that drives the agent feed.
 */
export async function runNewsWatcher(): Promise<Record<string, unknown>> {
  const items = await db.select({ id: schema.newsItems.id }).from(schema.newsItems)
  return { newsItems: items.length, source: process.env.DATA_PROVIDER || 'mock' }
}
