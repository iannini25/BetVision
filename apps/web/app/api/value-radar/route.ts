import { NextResponse } from 'next/server'
import { getValueRadar } from '@/services/matches.service'

export async function GET() {
  try {
    const items = await getValueRadar()
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Value radar error:', error)
    return NextResponse.json({ error: 'Erro ao buscar radar de valor' }, { status: 500 })
  }
}
