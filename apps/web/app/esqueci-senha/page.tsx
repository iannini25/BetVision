'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { animate, spring, utils } from 'animejs'
import { Sms } from 'iconsax-reactjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
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

  // Spring the "link sent" mark in when the success state mounts.
  useLayoutEffect(() => {
    const mark = markRef.current
    if (!mark || !sent || prefersReducedMotion()) return
    // Perceptual spring: the Spring instance IS the ease and owns the duration.
    const anim = animate(mark, { scale: [0, 1], opacity: [0, 1], ease: spring({ duration: 600, bounce: 0.45 }) })
    return () => {
      anim.revert()
    }
  }, [sent])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div ref={columnRef} className="w-full max-w-sm flex flex-col items-center gap-6">
        <h1 className="font-display font-bold text-2xl">Recuperar senha</h1>
        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div ref={markRef} className="text-accent-green-text">
              <Sms size={40} variant="Bold" color="currentColor" aria-hidden="true" />
            </div>
            <p className="text-sm text-text-secondary">
              Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <label htmlFor="forgot-email" className="sr-only">E-mail</label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <Button type="submit" loading={loading} fullWidth>
              Enviar link
            </Button>
          </form>
        )}
        <a href="/login" className="text-sm text-brand-light hover:underline">Voltar ao login</a>
      </div>
    </div>
  )
}
