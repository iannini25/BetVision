import { NextResponse } from 'next/server'
import { getPaymentActor, mintPaymentSubToken } from '@/lib/checkout-session'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

// Status do pagamento para o polling do checkout (confirma sozinho, sobrevive a refresh).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getPaymentActor()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.id, id)).limit(1)
  if (!payment || payment.userId !== actor.userId) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    paymentId: payment.id,
    status: payment.status,
    method: payment.method,
    subToken: mintPaymentSubToken(payment.id), // p/ reassinar a linha no WS após refresh/resume
    pix:
      payment.method === 'pix'
        ? { qrCodeBase64: payment.pixQrCode, copiaECola: payment.pixCopiaECola }
        : undefined,
    boletoUrl: payment.boletoUrl,
  })
}
