'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { utils } from 'animejs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { BetvLogo } from '@/components/landing/v2/betv-logo'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const columnRef = useRef<HTMLDivElement>(null)

  // Entrance: stagger the column children (logo -> form -> footer) in. useLayoutEffect
  // seeds the hidden from-state synchronously before paint (no flash); staggerReveal
  // owns the [from,to] tuples and snaps straight to the final state under reduced motion.
  useLayoutEffect(() => {
    const column = columnRef.current
    if (!column) return
    const children = Array.from(column.children) as Element[]
    if (!prefersReducedMotion()) utils.set(children, { opacity: 0 })
    const anim = staggerReveal(children, { y: 14 })
    return () => {
      anim?.revert()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login')
        return
      }

      if (!data.hasActiveSubscription) {
        router.push('/acesso-expirado')
        return
      }

      router.push('/hoje')
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div ref={columnRef} className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <BetvLogo height={44} priority />
          <h1 className="font-display font-bold text-2xl">BetV</h1>
          <p className="text-sm text-text-secondary text-center">
            Copiloto de apostas inteligente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold tracking-wider text-text-muted uppercase">E-mail</label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold tracking-wider text-text-muted uppercase">Senha</label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-accent-red bg-[rgba(251,77,109,0.08)] border border-[rgba(251,77,109,0.30)] rounded-input px-4 py-2.5">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} fullWidth>
            Entrar
          </Button>

          <a href="/esqueci-senha" className="text-sm text-brand-light text-center hover:underline">
            Esqueci minha senha
          </a>
        </form>

        <Disclaimer18 />
      </div>
    </div>
  )
}
