import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { SUBSCRIPTION_DAYS, SUBSCRIPTION_PRICE_BRL } from '@betv/shared'
import { sendWelcomeEmail } from '@betv/emails'

const isMockMP = !process.env.MP_ACCESS_TOKEN

export async function createPixPayment(userId: string) {
  if (isMockMP) {
    const [payment] = await db
      .insert(schema.payments)
      .values({
        userId,
        amount: SUBSCRIPTION_PRICE_BRL,
        status: 'pending',
        method: 'pix',
        mpPaymentId: `mock-${Date.now()}`,
        pixQrCode: 'data:image/png;base64,MOCK_QR_CODE',
        pixCopiaECola: '00020126580014br.gov.bcb.pix0136mock-pix-betv-online',
      })
      .returning()

    console.log(`[MP MOCK] Payment created: ${payment.id}`)
    return payment
  }

  // Real Mercado Pago integration would go here
  throw new Error('Real MP not implemented yet')
}

export async function processWebhook(paymentId: string, status: string) {
  const [existing] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.mpPaymentId, paymentId))
    .limit(1)

  if (!existing) return null

  if (existing.status === 'approved') return existing

  await db
    .update(schema.payments)
    .set({ status, atualizadoEm: new Date() })
    .where(eq(schema.payments.id, existing.id))

  if (status === 'approved') {
    const now = new Date()
    const [activeSub] = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, existing.userId),
          eq(schema.subscriptions.status, 'active')
        )
      )
      .limit(1)

    const startFrom = activeSub && new Date(activeSub.expiraEm) > now
      ? new Date(activeSub.expiraEm)
      : now
    const expiry = new Date(startFrom.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000)

    if (activeSub) {
      await db
        .update(schema.subscriptions)
        .set({ expiraEm: expiry })
        .where(eq(schema.subscriptions.id, activeSub.id))
    } else {
      await db.insert(schema.subscriptions).values({
        userId: existing.userId,
        status: 'active',
        inicioEm: now,
        expiraEm: expiry,
      })
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, existing.userId))
      .limit(1)

    if (user) {
      await sendWelcomeEmail(user.email, user.name)
    }
  }

  return existing
}
