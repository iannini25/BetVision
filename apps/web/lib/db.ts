import 'server-only'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '../../../packages/shared/src/db/schema'

const LOCAL_DOCKER_DATABASE_URL = 'postgresql://betv:betv_secret@localhost:5433/betv'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? LOCAL_DOCKER_DATABASE_URL,
})

export const db = drizzle(pool, { schema })
export { schema }
