import { NextResponse } from 'next/server'
import { setPasswordSchema } from '@betv/shared'
import { verifyAuthToken, updatePassword, getUserById } from '@/services/auth.service'
import { createSession } from '@/lib/auth'

// Define a senha a partir do link enviado por e-mail após o pagamento e já loga o usuário.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = setPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
    }

    const record = await verifyAuthToken(parsed.data.token, 'set_password')
    if (!record) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 })

    await updatePassword(record.userId, parsed.data.password)
    const user = await getUserById(record.userId)
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    await createSession({ userId: user.id, email: user.email })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Criar senha error:', error)
    return NextResponse.json({ error: 'Erro ao criar senha' }, { status: 500 })
  }
}
