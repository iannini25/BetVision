'use client'

import { useEffect, useRef, useState } from 'react'

type Options = {
  /** Disconnect after the first intersection (default true). */
  once?: boolean
  /** Visible fraction required to trigger (IntersectionObserver threshold). */
  amount?: number
  /** Shrink/grow the viewport bounds, e.g. '0px 0px -10% 0px'. */
  rootMargin?: string
}

/**
 * IntersectionObserver-based in-view detector. Replaces window 'scroll' listeners
 * for "animate when it enters the viewport" — the single source of truth for the
 * in-app reveal/count-up motion.
 */
export function useInView<T extends Element = HTMLDivElement>(options: Options = {}) {
  const { once = true, amount = 0.25, rootMargin = '0px' } = options
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold: amount, rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once, amount, rootMargin])

  return [ref, inView] as const
}
