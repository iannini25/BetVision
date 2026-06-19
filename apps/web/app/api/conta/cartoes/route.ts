import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { listSavedCards } from '@/services/payment.service'

// Cartões salvos do usuário (para oferecer renovação 1-clique).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const cards = await listSavedCards(session.userId)
  return NextResponse.json({
    cards: cards.map((c) => ({ id: c.id, lastFour: c.lastFour, brand: c.brand })),
  })
}
