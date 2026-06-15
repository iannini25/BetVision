import { NextResponse } from 'next/server'
import { getTodayMatches } from '@/services/matches.service'

export async function GET() {
  try {
    const matches = await getTodayMatches()
    return NextResponse.json({ matches })
  } catch (error) {
    console.error('Matches error:', error)
    return NextResponse.json({ error: 'Erro ao buscar jogos' }, { status: 500 })
  }
}
