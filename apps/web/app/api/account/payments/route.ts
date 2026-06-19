import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAccountPayments } from '@/services/payment.service'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const payments = await getAccountPayments(session.userId)
  return NextResponse.json({ payments })
}
