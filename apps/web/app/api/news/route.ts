import { NextResponse } from 'next/server'
import { getAgentFeed } from '@/services/matches.service'

export async function GET() {
  try {
    const news = await getAgentFeed()
    return NextResponse.json({ news })
  } catch (error) {
    console.error('Agent feed error:', error)
    return NextResponse.json({ error: 'Erro ao buscar o feed do agente' }, { status: 500 })
  }
}
