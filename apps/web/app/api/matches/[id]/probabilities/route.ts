import { NextResponse } from 'next/server'
import { getMatchProbabilities } from '@/services/matches.service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id, 10)
  if (isNaN(matchId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

  const probs = await getMatchProbabilities(matchId)
  return NextResponse.json({ probabilities: probs })
}
