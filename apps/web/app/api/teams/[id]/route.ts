import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teamId = parseInt(id, 10)
  if (isNaN(teamId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

  const [team] = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1)
  if (!team) return NextResponse.json({ error: 'Selecao nao encontrada' }, { status: 404 })

  const players = await db.select().from(schema.players).where(eq(schema.players.teamId, teamId))

  return NextResponse.json({ team, players })
}
