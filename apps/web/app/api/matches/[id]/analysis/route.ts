import { NextResponse } from 'next/server'
import { getMatchAnalysis } from '@/services/matches.service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id, 10)
  if (isNaN(matchId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const analyses = await getMatchAnalysis(matchId)
  return NextResponse.json({ analyses })
}
