'use client'

import { useRef } from 'react'
import { gsap } from './gsap-init'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

type Variant = 'fade-up' | 'clip-wipe' | 'blur-in' | 'scale-in' | 'slide-x'
type StaggerFrom = 'start' | 'center' | 'end' | 'edges'
type RevealOpts = {
  y?: number
  stagger?: number
  start?: string
  duration?: number
  /** Signature entrance per section — keeps the long scroll from feeling templated. */
  variant?: Variant
  /** Stagger origin across the matched items. */
  from?: StaggerFrom
}

/**
 * Staggered scroll-in for any descendants marked `[data-reveal]`. Returns the section ref.
 * Each section picks a `variant` so the page has rhythm instead of one repeated fade-up.
 * Reduced-motion shows everything in its final state.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLElement>(opts: RevealOpts = {}) {
  const { y = 26, stagger = 0.1, start = 'top 70%', duration = 0.7, variant = 'fade-up', from = 'start' } = opts
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const items = ref.current?.querySelectorAll<HTMLElement>('[data-reveal]')
      if (!items?.length) return
      if (reduced) {
        gsap.set(items, { opacity: 1, y: 0, x: 0, scale: 1, filter: 'none', clipPath: 'none' })
        return
      }

      const vars: gsap.TweenVars = { opacity: 0, duration, ease: 'power3.out' }
      switch (variant) {
        case 'clip-wipe':
          vars.clipPath = 'inset(0 0 100% 0)'
          vars.y = 14
          break
        case 'blur-in':
          vars.filter = 'blur(10px)'
          vars.y = 10
          break
        case 'scale-in':
          vars.scale = 0.94
          vars.y = 10
          vars.transformOrigin = 'center'
          break
        case 'slide-x':
          vars.x = -40
          break
        default:
          vars.y = y
      }
      vars.stagger = { each: stagger, from }

      gsap.from(items, {
        ...vars,
        scrollTrigger: { trigger: ref.current, start, once: true },
      })
    },
    { scope: ref, dependencies: [reduced] }
  )

  return ref
}
