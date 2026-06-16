import { and, eq, gt, lte, isNull } from 'drizzle-orm'
import { db, schema } from '../lib/db'
import { sendExpirationWarningEmail } from '@betv/emails'
import { EXPIRATION_WARNING_DAYS, daysUntil } from '@betv/shared'

const DAY_MS = 24 * 60 * 60 * 1000

export type ExpiringSub = { status: string; expiraEm: Date; expiryWarnedAt: Date | null }

/** Passe ativo que vence dentro da janela e ainda não foi avisado neste ciclo. */
export function isWarningDue(sub: ExpiringSub, now: Date, warningDays: number): boolean {
  if (sub.status !== 'active') return false
  if (sub.expiryWarnedAt) return false
  const days = daysUntil(sub.expiraEm, now)
  return days > 0 && days <= warningDays
}

/**
 * Cron diário: avisa por e-mail (pelo nome) quem está a até EXPIRATION_WARNING_DAYS do fim.
 * Idempotente por ciclo via `expiry_warned_at` (zerado na renovação) — não reenvia no mesmo período.
 */
export async function runSubscriptionExpiry(): Promise<Record<string, unknown>> {
  const now = new Date()
  const horizon = new Date(now.getTime() + EXPIRATION_WARNING_DAYS * DAY_MS)

  const due = await db
    .select({
      subId: schema.subscriptions.id,
      expiraEm: schema.subscriptions.expiraEm,
      email: schema.users.email,
      name: schema.users.name,
    })
    .from(schema.subscriptions)
    .innerJoin(schema.users, eq(schema.users.id, schema.subscriptions.userId))
    .where(
      and(
        eq(schema.subscriptions.status, 'active'),
        isNull(schema.subscriptions.expiryWarnedAt),
        gt(schema.subscriptions.expiraEm, now),
        lte(schema.subscriptions.expiraEm, horizon)
      )
    )

  let sent = 0
  for (const row of due) {
    const daysLeft = daysUntil(new Date(row.expiraEm), now)
    await sendExpirationWarningEmail(row.email, row.name, daysLeft)
    await db.update(schema.subscriptions).set({ expiryWarnedAt: new Date() }).where(eq(schema.subscriptions.id, row.subId))
    sent++
  }

  return { checked: due.length, sent }
}
