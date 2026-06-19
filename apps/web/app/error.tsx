'use client'

import { useLayoutEffect, useRef } from 'react'
import { animate, spring, utils } from 'animejs'
import { Danger, RotateLeft } from 'iconsax-reactjs'
import { Button } from '@/components/ui/button'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function Error({ reset }: { reset: () => void }) {
  const columnRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)

  // Entrance: spring the danger mark in, then stagger the text/CTA below it. The mark
  // and the reveal targets are disjoint, so their opacity tweens never fight.
  useLayoutEffect(() => {
    const column = columnRef.current
    const mark = markRef.current
    if (!column) return
    const revealTargets = (Array.from(column.children) as Element[]).filter((el) => el !== mark)
    if (prefersReducedMotion()) {
      utils.set(column.children, { opacity: 1, y: 0, scale: 1 })
      return
    }
    utils.set(revealTargets, { opacity: 0 })
    const reveal = staggerReveal(revealTargets, { y: 16 })
    const pop = mark
      ? animate(mark, { scale: [0, 1], opacity: [0, 1], ease: spring({ duration: 650, bounce: 0.5 }) })
      : undefined
    return () => {
      reveal?.revert()
      pop?.revert()
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary text-text-primary">
      <div ref={columnRef} className="max-w-md text-center flex flex-col items-center gap-6">
        <div ref={markRef} className="text-accent-red">
          <Danger size={48} variant="Bold" color="currentColor" aria-hidden="true" />
        </div>
        <h1 className="font-display font-bold text-2xl">Algo deu errado</h1>
        <p className="text-sm text-text-secondary">
          O agente encontrou um problema. Tente novamente.
        </p>
        <Button
          leftIcon={<RotateLeft size={18} variant="Linear" color="currentColor" aria-hidden="true" />}
          onClick={reset}
        >
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
