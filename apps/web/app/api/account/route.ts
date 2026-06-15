import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, updatePassword, deleteAccount } from '@/services/auth.service'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const user = await getUserById(session.userId)
  if (!user) return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerificado: user.emailVerificado,
    criadoEm: user.criadoEm,
  })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    const body = await request.json()

    if (body.name) {
      await db
        .update(schema.users)
        .set({ name: body.name, atualizadoEm: new Date() })
        .where(eq(schema.users.id, session.userId))
    }

    if (body.newPassword && body.currentPassword) {
      const { authenticateUser } = await import('@/services/auth.service')
      const user = await authenticateUser(session.email, body.currentPassword)
      if (!user) {
        return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
      }
      await updatePassword(session.userId, body.newPassword)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Account update error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  await deleteAccount(session.userId)
  const { destroySession } = await import('@/lib/auth')
  await destroySession()
  return NextResponse.json({ ok: true })
}
