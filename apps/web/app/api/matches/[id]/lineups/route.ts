import { NextResponse } from 'next/server'
import { getMatchLineups } from '@/services/matches.service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id, 10)
  if (isNaN(matchId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const lineups = await getMatchLineups(matchId)
  return NextResponse.json({ lineups })
}
