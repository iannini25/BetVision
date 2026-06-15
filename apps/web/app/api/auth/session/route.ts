import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getActiveSubscription } from '@/services/auth.service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const user = await getUserById(session.userId)
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const subscription = await getActiveSubscription(user.id)

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    hasActiveSubscription: !!subscription,
    expiresAt: subscription?.expiraEm ?? null,
    daysRemaining: subscription
      ? Math.max(0, Math.ceil((new Date(subscription.expiraEm).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : 0,
  })
}
