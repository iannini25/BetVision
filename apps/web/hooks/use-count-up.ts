'use client'

import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { useReducedMotion } from './use-reduced-motion'
import { useInView } from './use-in-view'

type CountUpOptions = {
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  /** anime.js v4 ease string (default 'out(3)'). */
  ease?: string
  /** Start only when scrolled into view (default true). Ignored when live. */
  onInView?: boolean
  /** Re-animate from the previous value whenever `value` changes (live data). */
  live?: boolean
  locale?: string
}

/**
 * Animated number that counts toward `value`. Writes textContent directly via
 * anime.js onUpdate (no per-frame React re-render), so it is cheap enough for KPIs,
 * probabilities and live odds. Honors prefers-reduced-motion by snapping to the
 * final value. Returns a ref to attach to the element that should hold the number.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(
  value: number,
  options: CountUpOptions = {},
) {
  const {
    duration = 1100,
    decimals = 0,
    prefix = '',
    suffix = '',
    ease = 'out(3)',
    onInView = true,
    live = false,
    locale = 'pt-BR',
  } = options

  const reduced = useReducedMotion()
  const [ref, inView, el] = useInView<T>({ once: !live })
  const prev = useRef(0)
  const started = useRef(false)

  useEffect(() => {
    if (!el) return

    const format = (n: number) =>
      prefix +
      n.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) +
      suffix

    const gated = onInView && !live ? inView : true
    if (!gated) return
    if (started.current && !live) return

    if (reduced) {
      el.textContent = format(value)
      prev.current = value
      started.current = true
      return
    }

    const from = started.current ? prev.current : 0
    const obj = { v: from }
    el.textContent = format(from)
    const anim = animate(obj, {
      v: value,
      duration,
      ease,
      onUpdate: () => {
        el.textContent = format(obj.v)
      },
    })
    prev.current = value
    started.current = true
    return () => {
      anim.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduced, el])

  return ref
}
