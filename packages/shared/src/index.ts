// Client-safe exports (types, schemas, constants — no server dependencies)
export * from './types'
export * from './schemas'
export * from './constants'

// Server-only exports — import directly from '@betv/shared/src/db/schema' or '@betv/shared/src/db/client'
// Do NOT re-export db/schema or db/client here — they pull in pg (net/tls) which breaks client builds
