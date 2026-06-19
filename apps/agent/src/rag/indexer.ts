import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://betv:betv_secret@localhost:5432/betv'

function simpleEmbedding(text: string): number[] {
  const tokens = text.toLowerCase().split(/\s+/)
  const dims = 64
  const vec = new Array(dims).fill(0)
  for (const token of tokens) {
    for (let i = 0; i < token.length && i < dims; i++) {
      vec[i] += token.charCodeAt(i) / 255
    }
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / mag)
}

export async function indexContent(content: string, metadata: Record<string, unknown>, matchId?: number, type?: string) {
  const pool = new pg.Pool({ connectionString: DATABASE_URL })
  const embedding = JSON.stringify(simpleEmbedding(content))

  await pool.query(
    `INSERT INTO rag_chunks (content, metadata, embedding, match_id, type) VALUES ($1, $2, $3, $4, $5)`,
    [content, JSON.stringify(metadata), embedding, matchId ?? null, type ?? 'general']
  )

  await pool.end()
}

export async function indexBatch(items: { content: string; metadata: Record<string, unknown>; matchId?: number; type?: string }[]) {
  const pool = new pg.Pool({ connectionString: DATABASE_URL })

  for (const item of items) {
    const embedding = JSON.stringify(simpleEmbedding(item.content))
    await pool.query(
      `INSERT INTO rag_chunks (content, metadata, embedding, match_id, type) VALUES ($1, $2, $3, $4, $5)`,
      [item.content, JSON.stringify(item.metadata), embedding, item.matchId ?? null, item.type ?? 'general']
    )
  }

  await pool.end()
}
