import { NextResponse } from 'next/server'
import { cadastroSchema } from '@betv/shared'
import { registerForCheckout } from '@/services/cadastro.service'
import { createCheckoutSession } from '@/lib/checkout-session'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = cadastroSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
    }

    const result = await registerForCheckout(parsed.data)
    if (!result.ok) {
      return NextResponse.json({ error: 'Você já tem uma conta. Faça login para renovar.' }, { status: 409 })
    }

    await createCheckoutSession(result.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Cadastro error:', error)
    return NextResponse.json({ error: 'Erro ao processar cadastro' }, { status: 500 })
  }
}
