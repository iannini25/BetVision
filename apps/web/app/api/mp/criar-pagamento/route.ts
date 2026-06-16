import { NextResponse } from 'next/server'
import { getPaymentActor } from '@/lib/checkout-session'
import { createPayment, type BrickFormData } from '@/services/payment.service'
import type { PaymentMethod } from '@betv/shared'

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
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
