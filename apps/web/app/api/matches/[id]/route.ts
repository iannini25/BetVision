import { NextResponse } from 'next/server'
import { getMatchById } from '@/services/matches.service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id, 10)
  if (isNaN(matchId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const match = await getMatchById(matchId)
  if (!match) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ match })
}
