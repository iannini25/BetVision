import { NextResponse } from 'next/server'
import { resetPasswordSchema } from '@betv/shared'
import { verifyAuthToken, updatePassword } from '@/services/auth.service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
    }

    const record = await verifyAuthToken(parsed.data.token, 'password_reset')
    if (!record) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 400 })
    }

    await updatePassword(record.userId, parsed.data.password)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
