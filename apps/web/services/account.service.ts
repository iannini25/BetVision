import { db, schema } from '@/lib/db'
import { eq, and, count } from 'drizzle-orm'

const { chatMessages, chatSessions, betEvaluations, users } = schema

const DAY_MS = 24 * 60 * 60 * 1000

export type AccountStats = {
  consultasChat: number
  oddsAvaliadas: number
  diasAtivos: number
}

/** Estatísticas de uso reais, medidas do banco (sem inventar números). */
export async function getAccountStats(userId: string): Promise<AccountStats> {
  const [chatRow] = await db
    .select({ n: count() })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatSessions.userId, userId), eq(chatMessages.role, 'user')))

  const [betRow] = await db.select({ n: count() }).from(betEvaluations).where(eq(betEvaluations.userId, userId))

  const [user] = await db.select({ criadoEm: users.criadoEm }).from(users).where(eq(users.id, userId)).limit(1)
  const diasAtivos = user ? Math.max(1, Math.floor((Date.now() - new Date(user.criadoEm).getTime()) / DAY_MS) + 1) : 0

  return { consultasChat: chatRow?.n ?? 0, oddsAvaliadas: betRow?.n ?? 0, diasAtivos }
}
