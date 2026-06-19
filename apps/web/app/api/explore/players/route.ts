import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'

export async function GET() {
  try {
    const players = await db.select().from(schema.players)
    const teams = await db.select().from(schema.teams)
    const teamMap = new Map(teams.map((t) => [t.id, t]))

    const result = players.map((p) => ({
      ...p,
      team: p.teamId ? teamMap.get(p.teamId) ?? null : null,
    }))

    return NextResponse.json({ players: result })
  } catch (error) {
    console.error('Explore players error:', error)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
