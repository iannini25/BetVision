import { NextResponse } from 'next/server'
import { getPaymentActor } from '@/lib/checkout-session'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

// Nome do ator do checkout (sessão OU cookie de checkout) para saudar o usuário pelo nome.
export async function GET() {
  const actor = await getPaymentActor()
  if (!actor) return NextResponse.json({ name: '' })

  const [user] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, actor.userId)).limit(1)
  return NextResponse.json({ name: user?.name ?? '' })
}
