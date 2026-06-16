import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAccountStats } from '@/services/account.service'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const stats = await getAccountStats(session.userId)
  return NextResponse.json(stats)
}
