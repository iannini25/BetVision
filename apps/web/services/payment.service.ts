import { db, schema } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import {
  SUBSCRIPTION_DAYS,
  SUBSCRIPTION_PRICE_BRL,
  calcFee,
  calcTotal,
  computeNewExpiry,
  isValidCpf,
  onlyDigits,
  splitName,
  type PaymentMethod,
} from '@betv/shared'
import { getMercadoPagoClient, isMockMP, type MpPaymentRequest } from '@betv/shared/mercadopago/client'
import { sendPaymentReceivedEmail, sendRenewalConfirmationEmail } from '@betv/emails'
import { createAuthToken } from './auth.service'

const { payments, subscriptions, users, paymentCards } = schema

const SET_PASSWORD_TOKEN_TYPE = 'set_password'
const SET_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000

/** Forma do que o Payment Brick devolve no onSubmit (o mock-checkout produz a mesma forma). */
export type BrickFormData = {
  token?: string
  payment_method_id?: string
  issuer_id?: string
  installments?: number
  payer?: { email?: string; identification?: { type?: string; number?: string } }
}

export type CreatePaymentResult = {
  paymentId: string
  status: string
  pix?: { qrCodeBase64: string | null; copiaECola: string | null }
  boletoUrl?: string | null
}

/**
 * Cria um pagamento: grava a linha local PENDING primeiro (o UUID vira external_reference
 * E X-Idempotency-Key — dedupe ponta a ponta e resolução à prova da corrida webhook-antes-do-create),
 * chama o Mercado Pago e persiste o retorno. Acesso só é liberado depois, no webhook (approved).
 */
export async function createPayment(
  userId: string,
  method: PaymentMethod,
  form: BrickFormData = {}
): Promise<CreatePaymentResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new Error('Usuário não encontrado')

  const fee = calcFee(SUBSCRIPTION_PRICE_BRL, method)
  const total = calcTotal(SUBSCRIPTION_PRICE_BRL, method)

  const [row] = await db
    .insert(payments)
    .values({ userId, amount: total, feeAmount: fee, method, status: 'pending' })
    .returning()

  const formCpf = onlyDigits(form.payer?.identification?.number ?? '')
  const validFormCpf = formCpf && isValidCpf(formCpf) ? formCpf : ''
  const cpf = validFormCpf || user.cpf || undefined
  const { firstName, lastName } = splitName(user.name)

  const req: MpPaymentRequest = {
    externalReference: row.id,
    amount: total,
    method,
    description: 'BetV — Passe da Copa (45 dias)',
    payer: {
      email: form.payer?.email || user.email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      identification: cpf ? { type: 'CPF', number: cpf } : undefined,
    },
    token: form.token,
    installments: form.installments,
    paymentMethodId: form.payment_method_id,
    issuerId: form.issuer_id,
    customerId: user.mpCustomerId || undefined,
  }

  const res = await getMercadoPagoClient().createPayment(req)

  await db
    .update(payments)
    .set({
      mpPaymentId: res.id,
      status: res.status,
      mpStatusDetail: res.statusDetail,
      pixQrCode: res.pixQrCodeBase64 ?? null,
      pixCopiaECola: res.pixQrCode ?? null,
      boletoUrl: res.boletoUrl ?? null,
      installments: form.installments ?? null,
      atualizadoEm: new Date(),
    })
    .where(eq(payments.id, row.id))

  // Captura o CPF (validado, só dígitos) quando o cliente o informa e ainda não temos.
  if (validFormCpf && !user.cpf) {
    await db.update(users).set({ cpf: validFormCpf, atualizadoEm: new Date() }).where(eq(users.id, userId))
  }

  return {
    paymentId: row.id,
    status: res.status,
    pix: method === 'pix' ? { qrCodeBase64: res.pixQrCodeBase64 ?? null, copiaECola: res.pixQrCode ?? null } : undefined,
    boletoUrl: res.boletoUrl ?? null,
  }
}

/**
 * Aplica uma atualização de status do MP de forma idempotente e atômica: a linha é travada
 * (FOR UPDATE), o guard "já approved?" e a extensão da assinatura ocorrem na mesma transação.
 * IO (e-mail, cartão mock) só roda após o commit, e só na PRIMEIRA aprovação.
 */
export async function processWebhook(
  localPaymentId: string,
  status: string,
  opts: { statusDetail?: string; paidAt?: Date } = {}
): Promise<{ found: boolean; freshlyApproved: boolean }> {
  const outcome = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, localPaymentId)).for('update').limit(1)
    if (!payment) return { found: false, freshlyApproved: false, userId: '', method: '' }
    if (payment.status === 'approved') return { found: true, freshlyApproved: false, userId: payment.userId, method: payment.method }

    await tx
      .update(payments)
      .set({
        status,
        mpStatusDetail: opts.statusDetail ?? payment.mpStatusDetail,
        paidAt: status === 'approved' ? opts.paidAt ?? new Date() : payment.paidAt,
        atualizadoEm: new Date(),
      })
      .where(eq(payments.id, payment.id))

    if (status !== 'approved') return { found: true, freshlyApproved: false, userId: payment.userId, method: payment.method }

    const now = new Date()
    const [activeSub] = await tx
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, payment.userId), eq(subscriptions.status, 'active')))
      .orderBy(desc(subscriptions.expiraEm)) // determinístico: estende sempre o passe mais recente
      .for('update')
      .limit(1)

    const expiry = computeNewExpiry(activeSub ? new Date(activeSub.expiraEm) : null, now, SUBSCRIPTION_DAYS)
    if (activeSub) {
      await tx.update(subscriptions).set({ expiraEm: expiry }).where(eq(subscriptions.id, activeSub.id))
    } else {
      await tx.insert(subscriptions).values({ userId: payment.userId, status: 'active', inicioEm: now, expiraEm: expiry })
    }

    return { found: true, freshlyApproved: true, userId: payment.userId, method: payment.method }
  })

  if (outcome.freshlyApproved) await onApproved(outcome.userId, outcome.method)
  return { found: outcome.found, freshlyApproved: outcome.freshlyApproved }
}

/** Pós-aprovação (fora da transação): e-mail certo e, no mock, cartão salvo para a renovação 1-clique. */
async function onApproved(userId: string, method: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return

  if (!user.passwordHash) {
    // Primeira compra (cadastro-first, senha ainda não criada): leva o usuário a criar a senha.
    const token = await createAuthToken(userId, SET_PASSWORD_TOKEN_TYPE, SET_PASSWORD_TTL_MS)
    await sendPaymentReceivedEmail(user.email, user.name, `${process.env.APP_URL}/criar-senha/${token}`)
  } else {
    const sub = await getActiveSubscriptionRow(userId)
    if (sub) await sendRenewalConfirmationEmail(user.email, user.name, new Date(sub.expiraEm))
  }

  if (isMockMP() && (method === 'credit' || method === 'debit') && user.mpCustomerId) {
    const [existing] = await db.select().from(paymentCards).where(eq(paymentCards.userId, userId)).limit(1)
    if (!existing) {
      await db.insert(paymentCards).values({
        userId,
        mpCustomerId: user.mpCustomerId,
        mpCardId: `mock-card-${userId}`,
        lastFour: '4242',
        brand: 'visa',
      })
    }
  }
}

/** Garante (idempotente) um Customer do MP para o usuário e guarda o id. */
export async function createCustomerForUser(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new Error('Usuário não encontrado')
  if (user.mpCustomerId) return user.mpCustomerId

  const { firstName, lastName } = splitName(user.name)
  const { id } = await getMercadoPagoClient().createCustomer({
    email: user.email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
  })
  await db.update(users).set({ mpCustomerId: id, atualizadoEm: new Date() }).where(eq(users.id, userId))
  return id
}

export async function listSavedCards(userId: string) {
  return db.select().from(paymentCards).where(eq(paymentCards.userId, userId))
}

async function getActiveSubscriptionRow(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .limit(1)
  return sub ?? null
}
