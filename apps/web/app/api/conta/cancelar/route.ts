import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { cancelSubscription } from '@/services/subscription.service'

// Cancela a assinatura recorrente (sessão obrigatória). Cancela no MP primeiro; se o MP falhar,
// o estado local NÃO muda (o usuário não fica achando que cancelou e seguindo cobrado) → 500.
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const result = await cancelSubscription(session.userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Cancelar error:', error)
    return NextResponse.json({ error: 'Não foi possível cancelar agora. Tente novamente.' }, { status: 500 })
  }
}
