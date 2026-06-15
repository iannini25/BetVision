import { NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@betv/shared'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { createAuthToken } from '@/services/auth.service'
import { sendPasswordResetEmail } from '@betv/emails'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'E-mail invalido' }, { status: 400 })
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, parsed.data.email))
      .limit(1)

    if (user && !user.deletadoEm) {
      const token = await createAuthToken(user.id, 'password_reset', 60 * 60 * 1000)
      await sendPasswordResetEmail(user.email, token)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
