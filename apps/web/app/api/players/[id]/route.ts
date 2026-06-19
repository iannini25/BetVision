import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const playerId = parseInt(id, 10)
  if (isNaN(playerId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

  const [player] = await db.select().from(schema.players).where(eq(schema.players.id, playerId)).limit(1)
  if (!player) return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })

  const team = player.teamId
    ? await db.select().from(schema.teams).where(eq(schema.teams.id, player.teamId)).then((r) => r[0])
    : null

  return NextResponse.json({ player, team })
}
