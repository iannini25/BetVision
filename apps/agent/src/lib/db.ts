import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '@betv/shared/src/db/schema'

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://betv:betv_secret@localhost:5432/betv',
})

export const db = drizzle(pool, { schema })
export { schema, pool }
export type { MatchEvent } from '@betv/shared/src/db/schema'
