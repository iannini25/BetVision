// Client-safe exports (types, schemas, constants, pure helpers — no server dependencies)
export * from './types'
export * from './schemas'
export * from './constants'
export * from './num'
export * from './bookmakers'
export * from './payments'
export * from './br-validators'

// Server-only exports — import directly from the src path, never from here:
//   '@betv/shared/src/db/schema', '@betv/shared/src/db/client'
//   '@betv/shared/src/mercadopago/client' (fetch + Access Token)
//   '@betv/shared/src/mp-signature' (node:crypto)
// Do NOT re-export them — they pull in pg/crypto/net which break client builds.
