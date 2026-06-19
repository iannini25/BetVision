import { NextResponse } from 'next/server'
import { verifyAuthToken, markEmailVerified } from '@/services/auth.service'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token necessario' }, { status: 400 })
    }

    const record = await verifyAuthToken(token, 'email_verification')
    if (!record) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 400 })
    }

    await markEmailVerified(record.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
