import { NextResponse } from 'next/server'
import { getPaymentActor } from '@/lib/checkout-session'
import { createRecurringSubscription, ConsentRequiredError, AlreadySubscribedError } from '@/services/subscription.service'
import { MercadoPagoError } from '@betv/shared/mercadopago/client'

// Cria a assinatura recorrente (cartão com trial de 2 dias). Ator = cookie de checkout OU sessão.
export async function POST(request: Request) {
  const actor = await getPaymentActor()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = (await request.json().catch(() => ({}))) as {
      cardToken?: string
      payerEmail?: string
      consent?: { accepted?: boolean; version?: string }
    }
    const result = await createRecurringSubscription(actor.userId, body.cardToken || '', body.payerEmail, {
      accepted: !!body.consent?.accepted,
      version: body.consent?.version,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ConsentRequiredError) return NextResponse.json({ error: error.message }, { status: 400 })
    if (error instanceof AlreadySubscribedError) return NextResponse.json({ error: error.message }, { status: 409 })
    if (error instanceof MercadoPagoError && error.status && error.status < 500) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Assinar error:', error)
    return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 })
  }
}
