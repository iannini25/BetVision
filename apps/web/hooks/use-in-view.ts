'use client'

import { useCallback, useEffect, useState } from 'react'

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
 *
 * Usa um *callback ref* (não um RefObject): o nó é observado sempre que ele monta,
 * inclusive quando aparece DEPOIS do primeiro render — caso de páginas que trocam
 * um skeleton de carregamento pelo conteúdo real (ex.: /conta). Um RefObject ficaria
 * preso ao `null` do primeiro render e nunca observaria o elemento de verdade.
 */
export function useInView<T extends Element = HTMLDivElement>(options: Options = {}) {
  const { once = true, amount = 0.25, rootMargin = '0px' } = options
  const [node, setNode] = useState<T | null>(null)
  const [inView, setInView] = useState(false)

  const ref = useCallback((el: T | null) => setNode(el), [])

  useEffect(() => {
    if (!node) return
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
    io.observe(node)
    return () => io.disconnect()
  }, [node, once, amount, rootMargin])

  return [ref, inView, node] as const
}
