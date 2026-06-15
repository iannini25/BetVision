import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'

export async function GET() {
  try {
    const referees = await db.select().from(schema.referees)
    return NextResponse.json({ referees })
  } catch (error) {
    console.error('Explore referees error:', error)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
