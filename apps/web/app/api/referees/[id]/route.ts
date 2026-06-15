import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const refId = parseInt(id, 10)
  if (isNaN(refId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

  const [referee] = await db.select().from(schema.referees).where(eq(schema.referees.id, refId)).limit(1)
  if (!referee) return NextResponse.json({ error: 'Arbitro nao encontrado' }, { status: 404 })

  const matchesWithRef = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.refereeId, refId))

  return NextResponse.json({ referee, matches: matchesWithRef })
}
