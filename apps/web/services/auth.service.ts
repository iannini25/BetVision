import { db, schema } from '@/lib/db'
const { users, authTokens, subscriptions } = schema
import { eq, and, gt } from 'drizzle-orm'
import { randomBytes } from 'crypto'

let argon2: typeof import('argon2') | null = null
async function getArgon2() {
  if (!argon2) argon2 = await import('argon2')
  return argon2
}

export async function authenticateUser(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || user.deletadoEm) return null
  // Usuário cadastro-first ainda sem senha (passwordHash vazio): não pode logar até criá-la.
  if (!user.passwordHash) return null

  const a2 = await getArgon2()
  const valid = await a2.verify(user.passwordHash, password)
  if (!valid) return null

  return user
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user?.deletadoEm ? null : user ?? null
}

export async function getActiveSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.expiraEm, new Date())
      )
    )
    .limit(1)
  return sub ?? null
}

export async function createAuthToken(userId: string, type: string, expiresInMs: number) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + expiresInMs)

  await db.insert(authTokens).values({
    userId,
    type,
    token,
    expiresAt,
  })

  return token
}

export async function verifyAuthToken(token: string, type: string) {
  const [record] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.token, token),
        eq(authTokens.type, type),
        gt(authTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!record || record.usedAt) return null

  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, record.id))

  return record
}

export async function updatePassword(userId: string, newPassword: string) {
  const a2 = await getArgon2()
  const hash = await a2.hash(newPassword)
  await db.update(users).set({ passwordHash: hash, atualizadoEm: new Date() }).where(eq(users.id, userId))
}

export async function markEmailVerified(userId: string) {
  await db.update(users).set({ emailVerificado: true, atualizadoEm: new Date() }).where(eq(users.id, userId))
}

export async function deleteAccount(userId: string) {
  await db.update(users).set({ deletadoEm: new Date(), atualizadoEm: new Date() }).where(eq(users.id, userId))
}
