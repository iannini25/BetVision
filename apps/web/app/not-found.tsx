'use client'

import { useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { utils } from 'animejs'
import { ArrowLeft } from 'iconsax-reactjs'
import { Button } from '@/components/ui/button'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function NotFound() {
  const router = useRouter()
  const columnRef = useRef<HTMLDivElement>(null)

  // Entrance: stagger the column children in (seed hidden state before paint, no flash).
  useLayoutEffect(() => {
    const column = columnRef.current
    if (!column) return
    const children = Array.from(column.children) as Element[]
    if (!prefersReducedMotion()) utils.set(children, { opacity: 0 })
    const anim = staggerReveal(children, { y: 16 })
    return () => {
      anim?.revert()
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary text-text-primary">
      <div ref={columnRef} className="max-w-md text-center flex flex-col items-center gap-6">
        <span className="font-display font-extrabold text-8xl text-brand-light/20">404</span>
        <h1 className="font-display font-bold text-2xl">Página não encontrada</h1>
        <p className="text-sm text-text-secondary">
          O lance que você procura não existe ou foi arquivado.
        </p>
        <Button
          leftIcon={<ArrowLeft size={18} variant="Linear" color="currentColor" aria-hidden="true" />}
          onClick={() => router.push('/hoje')}
        >
          Voltar ao dashboard
        </Button>
      </div>
    </div>
  )
}
