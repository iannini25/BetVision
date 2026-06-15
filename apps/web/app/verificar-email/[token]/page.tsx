'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, spring } from 'animejs'
import { TickCircle, CloseCircle } from 'iconsax-reactjs'
import { prefersReducedMotion } from '@/lib/motion'

export default function VerificarEmailPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const markRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'))
  }, [token])

  // Spring the result mark in once the request resolves. Seeds scale 0 before paint.
  useLayoutEffect(() => {
    const mark = markRef.current
    if (!mark || status === 'loading' || prefersReducedMotion()) return
    const anim = animate(mark, { scale: [0, 1], opacity: [0, 1], ease: spring({ duration: 650, bounce: 0.5 }) })
    return () => {
      anim.revert()
    }
  }, [status])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div role="status" aria-live="polite" className="max-w-sm text-center flex flex-col items-center gap-4">
        {status === 'loading' && <p className="text-text-secondary">Verificando...</p>}
        {status === 'success' && (
          <>
            <div ref={markRef} className="text-accent-green-text">
              <TickCircle size={48} variant="Bold" color="currentColor" aria-hidden="true" />
            </div>
            <p className="text-accent-green-text font-semibold">E-mail verificado!</p>
            <a href="/hoje" className="text-sm text-brand-light hover:underline">Ir para o dashboard</a>
          </>
        )}
        {status === 'error' && (
          <>
            <div ref={markRef} className="text-accent-red">
              <CloseCircle size={48} variant="Bold" color="currentColor" aria-hidden="true" />
            </div>
            <p className="text-accent-red">Token inválido ou expirado.</p>
            <a href="/login" className="text-sm text-brand-light hover:underline">Voltar ao login</a>
          </>
        )}
      </div>
    </div>
  )
}
