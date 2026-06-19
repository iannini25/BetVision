'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { animate, spring, utils } from 'animejs'
import { TickCircle } from 'iconsax-reactjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function RedefinirSenhaPage({ params }: { params: { token: string } }) {
  const { token } = params
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const columnRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)

  // Entrance: stagger the column children in (seed hidden state before paint, no flash).
  useLayoutEffect(() => {
    const column = columnRef.current
    if (!column) return
    const children = Array.from(column.children) as Element[]
    if (!prefersReducedMotion()) utils.set(children, { opacity: 0 })
    const anim = staggerReveal(children)
    return () => {
      anim?.revert()
    }
  }, [])

  // Spring the success tick in when the done state mounts.
  useLayoutEffect(() => {
    const mark = markRef.current
    if (!mark || !done || prefersReducedMotion()) return
    const anim = animate(mark, { scale: [0, 1], opacity: [0, 1], ease: spring({ duration: 600, bounce: 0.45 }) })
    return () => {
      anim.revert()
    }
  }, [done])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div ref={columnRef} className="w-full max-w-sm flex flex-col items-center gap-6">
        <h1 className="font-display font-bold text-2xl">Nova senha</h1>
        {done ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div ref={markRef} className="text-accent-green-text">
              <TickCircle size={44} variant="Bold" color="currentColor" aria-hidden="true" />
            </div>
            <p className="text-sm text-accent-green-text">Senha alterada! Redirecionando ao login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <label htmlFor="new-password" className="sr-only">Nova senha</label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha (min. 6 caracteres)"
              minLength={6}
              required
              aria-describedby={error ? 'reset-error' : undefined}
            />
            {error && <p id="reset-error" role="alert" className="text-sm text-accent-red">{error}</p>}
            <Button type="submit" loading={loading} fullWidth>
              Redefinir senha
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
