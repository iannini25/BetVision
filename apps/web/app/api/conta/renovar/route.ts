import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createPayment, type BrickFormData } from '@/services/payment.service'
import { getActiveSubscription } from '@/services/auth.service'
import { canRenew, RENEWAL_UNLOCK_DAYS, type PaymentMethod } from '@betv/shared'
import { MercadoPagoError } from '@betv/shared/mercadopago/client'

const METHODS: PaymentMethod[] = ['pix', 'credit', 'debit', 'boleto', 'wallet']

// Renovação (usuário autenticado): mesmo fluxo de criar pagamento; o webhook empilha +45 dias.
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = (await request.json().catch(() => ({}))) as { method?: string; brickFormData?: BrickFormData }
    const method = body.method as PaymentMethod
    if (!METHODS.includes(method)) return NextResponse.json({ error: 'Método inválido' }, { status: 400 })

    // Regra de negócio no servidor (não confiar no gate do cliente): só renova perto do vencimento.
    const sub = await getActiveSubscription(session.userId)
    if (!canRenew(sub ? new Date(sub.expiraEm) : null, new Date(), RENEWAL_UNLOCK_DAYS)) {
      return NextResponse.json(
        { error: `A renovação abre quando faltarem ${RENEWAL_UNLOCK_DAYS} dias para expirar.` },
        { status: 409 }
      )
    }

    const result = await createPayment(session.userId, method, body.brickFormData ?? {})
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof MercadoPagoError && error.status && error.status < 500) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Renovar error:', error)
    return NextResponse.json({ error: 'Erro ao renovar' }, { status: 500 })
  }
}
