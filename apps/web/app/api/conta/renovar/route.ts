import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createPayment, type BrickFormData } from '@/services/payment.service'
import type { PaymentMethod } from '@betv/shared'

const METHODS: PaymentMethod[] = ['pix', 'credit', 'debit', 'boleto', 'wallet']

// Renovação (usuário autenticado): mesmo fluxo de criar pagamento; o webhook empilha +45 dias.
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = (await request.json().catch(() => ({}))) as { method?: string; brickFormData?: BrickFormData }
    const method = body.method as PaymentMethod
    if (!METHODS.includes(method)) return NextResponse.json({ error: 'Método inválido' }, { status: 400 })

    const result = await createPayment(session.userId, method, body.brickFormData ?? {})
    return NextResponse.json(result)
  } catch (error) {
    console.error('Renovar error:', error)
    return NextResponse.json({ error: 'Erro ao renovar' }, { status: 500 })
  }
}
