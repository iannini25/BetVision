import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://betv:betv_secret@localhost:5432/betv'

export type RagChunk = {
  id: number
  content: string
  metadata: Record<string, unknown>
  matchId: number | null
  type: string | null
  score?: number
}

export async function retrieveChunks(query: string, options?: { matchId?: number; type?: string; limit?: number }): Promise<RagChunk[]> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL })
  const limit = options?.limit ?? 5

  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (options?.matchId) {
    conditions.push(`match_id = $${idx++}`)
    params.push(options.matchId)
  }
  if (options?.type) {
    conditions.push(`type = $${idx++}`)
    params.push(options.type)
  }

  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  if (keywords.length > 0) {
    const likeConditions = keywords.map((kw) => {
      params.push(`%${kw}%`)
      return `LOWER(content) LIKE $${idx++}`
    })
    conditions.push(`(${likeConditions.join(' OR ')})`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await pool.query(
    `SELECT id, content, metadata, match_id AS "matchId", type FROM rag_chunks ${where} ORDER BY criado_em DESC LIMIT ${limit}`,
    params
  )

  await pool.end()

  return result.rows.map((row: any) => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
  }))
}
