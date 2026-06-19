import { NextResponse } from 'next/server'
import { loginSchema } from '@betv/shared'
import { authenticateUser, getActiveSubscription } from '@/services/auth.service'
import { createSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const user = await authenticateUser(parsed.data.email, parsed.data.password)
    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    const subscription = await getActiveSubscription(user.id)
    await createSession({ userId: user.id, email: user.email })

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      hasActiveSubscription: !!subscription,
      expiresAt: subscription?.expiraEm ?? null,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
