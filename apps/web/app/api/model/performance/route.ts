import { NextResponse } from 'next/server'
import { getModelPerformance } from '@/services/matches.service'

export async function GET() {
  try {
    const data = await getModelPerformance()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Model performance error:', error)
    return NextResponse.json({ error: 'Erro ao buscar performance' }, { status: 500 })
  }
}
