'use client'

import { useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { utils } from 'animejs'
import { Wallet2 } from 'iconsax-reactjs'
import { Button } from '@/components/ui/button'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { BetvLogo } from '@/components/landing/v2/betv-logo'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function AcessoExpiradoPage() {
  const router = useRouter()
  const columnRef = useRef<HTMLDivElement>(null)

  // Entrance: stagger the column children in (seed hidden state before paint, no flash).
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

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div ref={columnRef} className="max-w-md text-center flex flex-col items-center gap-6">
        <div className="opacity-60">
          <BetvLogo height={56} priority />
        </div>
        <h1 className="font-display font-bold text-2xl">Passe expirado</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          Seu acesso ao BetV expirou. Renove seu passe de 45 dias para continuar vendo probabilidades, análises e o radar de valor.
        </p>
        <Button
          size="lg"
          leftIcon={<Wallet2 size={18} variant="Bold" color="currentColor" aria-hidden="true" />}
          onClick={() => router.push('/checkout')}
        >
          Renovar passe · R$ 14,90
        </Button>
        <Disclaimer18 />
      </div>
    </div>
  )
}
