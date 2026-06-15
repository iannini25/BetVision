import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'

export async function GET() {
  try {
    const teams = await db.select().from(schema.teams).orderBy(schema.teams.elo)
    return NextResponse.json({ teams: teams.reverse() })
  } catch (error) {
    console.error('Explore teams error:', error)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
