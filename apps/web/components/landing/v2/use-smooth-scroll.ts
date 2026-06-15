'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap-init'
import { setLenisScrollV } from './eye-stage'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

/**
 * Smooth scroll (Lenis) wired into GSAP ScrollTrigger as a single source of truth:
 * Lenis drives GSAP's ticker, and every Lenis scroll updates ScrollTrigger. This avoids
 * the "two scroll systems fighting" failure. Reduced-motion: skip Lenis, native scroll only.
 */
export function useSmoothScroll() {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (reduced) {
      ScrollTrigger.refresh()
      return
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    })

    lenis.on('scroll', ScrollTrigger.update)
    // expose the smooth-scroll velocity as the single source for the reactive background
    lenis.on('scroll', () => setLenisScrollV(lenis.velocity))
    const onTick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    // Recompute trigger positions once fonts/layout settle.
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    const settleTimer = window.setTimeout(refresh, 600)

    return () => {
      gsap.ticker.remove(onTick)
      lenis.destroy()
      window.removeEventListener('load', refresh)
      window.clearTimeout(settleTimer)
    }
  }, [reduced])
}
