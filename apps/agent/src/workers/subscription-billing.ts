import { and, eq, gt, lte, lt, isNull, inArray } from 'drizzle-orm'
import { db, schema } from '../lib/db'
import { sendTrialPreChargeEmail } from '@betv/emails'
import { PRE_CHARGE_WARN_DAYS, RECURRING_AMOUNT_BRL } from '@betv/shared'

const DAY_MS = 24 * 60 * 60 * 1000
// Carência depois de vencido antes de marcar 'expired' (housekeeping, não revoga acesso — o gate
// hasAccess já bloqueia por expiraEm; isto só limpa o estado de assinaturas recorrentes que lapsaram).
const EXPIRY_GRACE_MS = DAY_MS

export type TrialSub = { status: string; trialEndsAt: Date; preChargeWarnedAt: Date | null }

/** Aviso pré-cobrança é devido: trial ativo, ainda não avisado, e a 1ª cobrança cai na janela. */
export function isPreChargeDue(sub: TrialSub, now: Date, warnWithinMs: number): boolean {
  if (sub.status !== 'trial') return false
  if (sub.preChargeWarnedAt) return false
  const ms = sub.trialEndsAt.getTime() - now.getTime()
  return ms > 0 && ms <= warnWithinMs
}

/**
 * Cron de cobrança/assinatura (DB-puro; a cobrança em si é nativa do MP e chega via webhook):
 *  (a) ANTI-CHARGEBACK — aviso na manhã antes da 1ª cobrança do trial, idempotente via
 *      `pre_charge_warned_at` (marca ao enviar; nunca reenvia no mesmo ciclo).
 *  (b) housekeeping idempotente — assinaturas recorrentes vencidas há > carência viram 'expired'.
 * (Reconciliação via API do MP não roda aqui: o client é server-only, vive no web/webhook.)
 */
export async function runSubscriptionBilling(): Promise<Record<string, unknown>> {
  const now = new Date()
  const horizon = new Date(now.getTime() + PRE_CHARGE_WARN_DAYS * DAY_MS)

  const dueTrials = await db
    .select({
      subId: schema.subscriptions.id,
      trialEndsAt: schema.subscriptions.trialEndsAt,
      nextChargeAt: schema.subscriptions.nextChargeAt,
      email: schema.users.email,
      name: schema.users.name,
    })
    .from(schema.subscriptions)
    .innerJoin(schema.users, eq(schema.users.id, schema.subscriptions.userId))
    .where(
      and(
        eq(schema.subscriptions.status, 'trial'),
        isNull(schema.subscriptions.preChargeWarnedAt),
        gt(schema.subscriptions.trialEndsAt, now),
        lte(schema.subscriptions.trialEndsAt, horizon)
      )
    )

  let warned = 0
  for (const t of dueTrials) {
    if (!t.trialEndsAt) continue
    const chargeDate = new Date(t.nextChargeAt ?? t.trialEndsAt)
    await sendTrialPreChargeEmail(t.email, t.name, chargeDate, RECURRING_AMOUNT_BRL)
    await db.update(schema.subscriptions).set({ preChargeWarnedAt: now }).where(eq(schema.subscriptions.id, t.subId))
    warned++
  }

  // Housekeeping idempotente: recorrentes vencidas (qualquer estado de acesso) há > carência → expired.
  const staleBefore = new Date(now.getTime() - EXPIRY_GRACE_MS)
  const expired = await db
    .update(schema.subscriptions)
    .set({ status: 'expired' })
    .where(
      and(
        eq(schema.subscriptions.type, 'recorrente_cartao'),
        inArray(schema.subscriptions.status, ['trial', 'active', 'cancelled', 'past_due']),
        lt(schema.subscriptions.expiraEm, staleBefore)
      )
    )
    .returning({ id: schema.subscriptions.id })

  return { warned, expired: expired.length }
}
