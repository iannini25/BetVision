'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { animate, spring, utils } from 'animejs'
import { TickCircle } from 'iconsax-reactjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function CriarSenhaPage({ params }: { params: { token: string } }) {
  const { token } = params
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const columnRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)

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
      const res = await fetch('/api/auth/criar-senha', {
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
      setTimeout(() => router.push('/hoje'), 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div ref={columnRef} className="w-full max-w-sm flex flex-col items-center gap-6">
        <h1 className="font-display font-bold text-2xl">Crie sua senha</h1>
        {done ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div ref={markRef} className="text-accent-green-text">
              <TickCircle size={44} variant="Bold" color="currentColor" aria-hidden="true" />
            </div>
            <p className="text-sm text-accent-green-text">Conta criada! Entrando…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <label htmlFor="new-password" className="sr-only">
              Senha
            </label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha (mín. 6 caracteres)"
              minLength={6}
              required
              autoComplete="new-password"
              aria-describedby={error ? 'criar-senha-error' : undefined}
            />
            {error && <p id="criar-senha-error" role="alert" className="text-sm text-accent-red">{error}</p>}
            <Button type="submit" loading={loading} fullWidth>
              Criar senha e entrar
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
