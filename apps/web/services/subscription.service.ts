import { db, schema } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import {
  TRIAL_DAYS,
  RECURRING_FREQUENCY_DAYS,
  RECURRING_AMOUNT_BRL,
  CONSENT_VERSION,
  computeNewExpiry,
} from '@betv/shared'
import { getMercadoPagoClient, MercadoPagoError } from '@betv/shared/mercadopago/client'
import {
  sendTrialStartedEmail,
  sendRecurringChargeSuccessEmail,
  sendRecurringChargeFailedEmail,
  sendSubscriptionCancelledEmail,
} from '@betv/emails'
import { createAuthToken } from './auth.service'

const { subscriptions, users, payments } = schema

const DAY_MS = 24 * 60 * 60 * 1000
const SET_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000
const ACTIVE_RECURRING = ['trial', 'active'] as const

export class ConsentRequiredError extends Error {
  constructor() {
    super('É preciso aceitar os termos do teste/assinatura para continuar.')
    this.name = 'ConsentRequiredError'
  }
}
export class AlreadySubscribedError extends Error {
  constructor() {
    super('Você já tem uma assinatura ativa.')
    this.name = 'AlreadySubscribedError'
  }
}

export type RecurringConsent = { accepted: boolean; version?: string }
export type CreateRecurringResult = {
  subscriptionId: string
  status: string
  trialEndsAt: Date
  nextChargeAt: Date | null
  setPasswordToken?: string
}

/**
 * Cria a assinatura recorrente (cartão) com trial nativo de 2 dias.
 * Consentimento é GRAVADO antes de criar o preapproval (defesa em disputa); sem consent → não cria.
 * Se o MP recusar (cartão), a linha local é desfeita (sem trial fantasma).
 */
export async function createRecurringSubscription(
  userId: string,
  cardToken: string,
  payerEmail: string | undefined,
  consent: RecurringConsent
): Promise<CreateRecurringResult> {
  if (!consent?.accepted) throw new ConsentRequiredError()
  if (!cardToken) throw new MercadoPagoError('cardToken ausente', 400)

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new Error('Usuário não encontrado')

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.type, 'recorrente_cartao'),
        inArray(subscriptions.status, ACTIVE_RECURRING as unknown as string[])
      )
    )
    .limit(1)
  if (existing) throw new AlreadySubscribedError()

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * DAY_MS)

  // Consentimento gravado ANTES do preapproval.
  const [row] = await db
    .insert(subscriptions)
    .values({
      userId,
      type: 'recorrente_cartao',
      status: 'trial',
      inicioEm: now,
      expiraEm: trialEndsAt,
      trialEndsAt,
      consentAt: now,
      consentVersion: consent.version || CONSENT_VERSION,
    })
    .returning()

  let preapproval
  try {
    preapproval = await getMercadoPagoClient().createPreapproval({
      externalReference: row.id,
      cardToken,
      payerEmail: payerEmail || user.email,
      amount: RECURRING_AMOUNT_BRL,
      frequencyDays: RECURRING_FREQUENCY_DAYS,
      trialDays: TRIAL_DAYS,
      reason: 'BetV — Assinatura (Passe da Copa)',
      backUrl: `${process.env.APP_URL}/conta`,
    })
  } catch (err) {
    await db.delete(subscriptions).where(eq(subscriptions.id, row.id)) // desfaz trial fantasma
    throw err
  }

  if (preapproval.status !== 'authorized') {
    await db.delete(subscriptions).where(eq(subscriptions.id, row.id))
    throw new MercadoPagoError(`Assinatura não autorizada (${preapproval.status})`, 402)
  }

  const nextChargeAt = preapproval.nextPaymentDate ? new Date(preapproval.nextPaymentDate) : trialEndsAt
  await db
    .update(subscriptions)
    .set({ mpPreapprovalId: preapproval.id, nextChargeAt })
    .where(eq(subscriptions.id, row.id))

  // Cadastro-first (sem senha): cria token + e-mail de início do trial (com 1ª cobrança + como cancelar).
  let setPasswordToken: string | undefined
  if (!user.passwordHash) {
    setPasswordToken = await createAuthToken(userId, 'set_password', SET_PASSWORD_TTL_MS)
    await sendTrialStartedEmail(user.email, user.name, `${process.env.APP_URL}/criar-senha/${setPasswordToken}`, nextChargeAt)
  }

  return { subscriptionId: row.id, status: 'trial', trialEndsAt, nextChargeAt, setPasswordToken }
}

/**
 * Cancela a assinatura. Cancela no MP PRIMEIRO; se o MP falhar, NÃO marca como cancelada localmente
 * (senão o usuário acha que cancelou e segue sendo cobrado). Acesso mantido até o fim do período pago.
 */
export async function cancelSubscription(userId: string): Promise<{ cancelled: boolean; accessUntil: Date }> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.type, 'recorrente_cartao'),
        inArray(subscriptions.status, ACTIVE_RECURRING as unknown as string[])
      )
    )
    .orderBy(desc(subscriptions.expiraEm))
    .limit(1)
  if (!sub || !sub.mpPreapprovalId) throw new Error('Nenhuma assinatura ativa para cancelar')

  await getMercadoPagoClient().cancelPreapproval(sub.mpPreapprovalId) // lança se o MP falhar → estado local intacto

  await db.update(subscriptions).set({ status: 'cancelled', cancelledAt: new Date() }).where(eq(subscriptions.id, sub.id))

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (user) await sendSubscriptionCancelledEmail(user.email, user.name, new Date(sub.expiraEm))
  return { cancelled: true, accessUntil: new Date(sub.expiraEm) }
}

/**
 * Aplica uma cobrança recorrente (authorized_payment) de forma idempotente e atômica.
 * Trava a assinatura (FOR UPDATE), dedupe pela linha de payments (mpPaymentId = authorized_payment id —
 * o MP pode reenviar o mesmo evento). Aprovado → +ciclo/active; recusado → past_due. E-mail só na 1ª vez.
 */
export async function applyAuthorizedPayment(
  authorizedPaymentId: string,
  preapprovalId: string,
  paymentStatus: string,
  debitDate: string | null,
  amount?: number
): Promise<{ found: boolean; alreadyProcessed: boolean; approved: boolean }> {
  const outcome = await db.transaction(async (tx) => {
    const [sub] = await tx.select().from(subscriptions).where(eq(subscriptions.mpPreapprovalId, preapprovalId)).for('update').limit(1)
    if (!sub) return { found: false, alreadyProcessed: false, approved: false, userId: '' }

    const [existingPay] = await tx.select().from(payments).where(eq(payments.mpPaymentId, authorizedPaymentId)).limit(1)
    if (existingPay) return { found: true, alreadyProcessed: true, approved: existingPay.status === 'approved', userId: sub.userId }

    const approved = paymentStatus === 'approved'
    await tx.insert(payments).values({
      userId: sub.userId,
      mpPaymentId: authorizedPaymentId,
      amount: amount || RECURRING_AMOUNT_BRL,
      status: approved ? 'approved' : 'rejected',
      method: 'credit',
      paidAt: approved ? (debitDate ? new Date(debitDate) : new Date()) : null,
    })

    if (approved) {
      const expiry = computeNewExpiry(new Date(sub.expiraEm), new Date(), RECURRING_FREQUENCY_DAYS)
      await tx
        .update(subscriptions)
        .set({ status: 'active', expiraEm: expiry, nextChargeAt: expiry, preChargeWarnedAt: null })
        .where(eq(subscriptions.id, sub.id))
    } else {
      await tx.update(subscriptions).set({ status: 'past_due' }).where(eq(subscriptions.id, sub.id))
    }
    return { found: true, alreadyProcessed: false, approved, userId: sub.userId }
  })

  if (outcome.found && !outcome.alreadyProcessed) {
    const [user] = await db.select().from(users).where(eq(users.id, outcome.userId)).limit(1)
    if (user) {
      if (outcome.approved) {
        const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, outcome.userId)).orderBy(desc(subscriptions.expiraEm)).limit(1)
        await sendRecurringChargeSuccessEmail(user.email, user.name, RECURRING_AMOUNT_BRL, new Date(sub?.nextChargeAt ?? sub?.expiraEm ?? Date.now()))
      } else {
        await sendRecurringChargeFailedEmail(user.email, user.name)
      }
    }
  }
  return { found: outcome.found, alreadyProcessed: outcome.alreadyProcessed, approved: outcome.approved }
}

/** Reflete localmente a mudança de status do acordo (ex.: usuário cancelou direto no MP). */
export async function applyPreapprovalStatus(preapprovalId: string, mpStatus: string): Promise<{ found: boolean }> {
  return db.transaction(async (tx) => {
    const [sub] = await tx.select().from(subscriptions).where(eq(subscriptions.mpPreapprovalId, preapprovalId)).for('update').limit(1)
    if (!sub) return { found: false }
    if (mpStatus === 'cancelled' && sub.status !== 'cancelled') {
      await tx.update(subscriptions).set({ status: 'cancelled', cancelledAt: new Date() }).where(eq(subscriptions.id, sub.id))
    } else if (mpStatus === 'paused' && sub.status !== 'past_due') {
      await tx.update(subscriptions).set({ status: 'past_due' }).where(eq(subscriptions.id, sub.id))
    }
    return { found: true }
  })
}
