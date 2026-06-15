import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const payments = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.userId, session.userId))
    .orderBy(desc(schema.payments.criadoEm))

  return NextResponse.json({ payments })
}
