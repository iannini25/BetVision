import { NextResponse } from 'next/server'
import { getPaymentActor } from '@/lib/checkout-session'
import { createPayment, PaymentRateLimitError, type BrickFormData } from '@/services/payment.service'
import type { PaymentMethod } from '@betv/shared'
import { MercadoPagoError } from '@betv/shared/mercadopago/client'

const METHODS: PaymentMethod[] = ['pix', 'credit', 'debit', 'boleto', 'wallet']

export async function POST(request: Request) {
  const actor = await getPaymentActor()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = (await request.json().catch(() => ({}))) as { method?: string; brickFormData?: BrickFormData }
    const method = body.method as PaymentMethod
    if (!METHODS.includes(method)) return NextResponse.json({ error: 'Método inválido' }, { status: 400 })

    const result = await createPayment(actor.userId, method, body.brickFormData ?? {})
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PaymentRateLimitError) return NextResponse.json({ error: error.message }, { status: 429 })
    // Erro 4xx do MP (ex.: cartão recusado) é definitivo do payer — repassa status/mensagem, não 500.
    if (error instanceof MercadoPagoError && error.status && error.status < 500) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
