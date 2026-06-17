'use client'

import { useEffect, useState, useCallback } from 'react'

type Subscription = {
  type: string
  status: string
  nextChargeAt: string | null
  trialEndsAt: string | null
  cancelledAt: string | null
}

type SessionData = {
  user: { id: string; name: string; email: string } | null
  hasActiveSubscription: boolean
  expiresAt: string | null
  daysRemaining: number
  subscription?: Subscription | null
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (!res.ok) {
        setSession({ user: null, hasActiveSubscription: false, expiresAt: null, daysRemaining: 0 })
        return
      }
      const data = await res.json()
      setSession(data)
    } catch {
      setSession({ user: null, hasActiveSubscription: false, expiresAt: null, daysRemaining: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setSession({ user: null, hasActiveSubscription: false, expiresAt: null, daysRemaining: 0 })
    window.location.href = '/login'
  }, [])

  return { session, loading, refresh, logout }
}
