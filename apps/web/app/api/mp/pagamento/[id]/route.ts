import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

// Status do pagamento para o polling do checkout (confirma sozinho, sobrevive a refresh).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.id, id)).limit(1)
  if (!payment || payment.userId !== session.userId) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ paymentId: payment.id, status: payment.status, method: payment.method })
}
