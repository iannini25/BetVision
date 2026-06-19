'use client'

import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useInView } from '@/hooks/use-in-view'
import { useCountUp } from '@/hooks/use-count-up'

type ProbBarProps = {
  label: string
  value: number
  showPercent?: boolean
  /** Re-animate from the previous value on change (live probability recalcs). */
  live?: boolean
}

export function ProbBar({ label, value, showPercent = true, live = false }: ProbBarProps) {
  const pct = Math.round(value * 100)
  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>({ once: !live })
  const fillRef = useRef<HTMLDivElement>(null)
  const pctRef = useCountUp<HTMLSpanElement>(pct, { suffix: '%', live, onInView: !live, duration: 760 })
  const prev = useRef(0)
  const started = useRef(false)

  // The fill scales on the X axis (transform — compositor-friendly) instead of
  // tweening `width`, so a stack of bars can build without layout thrash.
  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return
    const gated = live ? true : inView
    if (!gated) return
    if (started.current && !live) return

    if (reduced) {
      fill.style.transform = `scaleX(${value})`
      prev.current = value
      started.current = true
      return
    }

    const from = started.current ? prev.current : 0
    const obj = { s: from }
    fill.style.transform = `scaleX(${from})`
    const anim = animate(obj, {
      s: value,
      duration: 760,
      ease: 'out(3)',
      onUpdate: () => {
        fill.style.transform = `scaleX(${obj.s})`
      },
    })
    prev.current = value
    started.current = true
    return () => {
      anim.revert()
    }
  }, [value, inView, reduced, live])

  return (
    <div ref={wrapRef} className="flex flex-col gap-1">
      <div className="flex justify-between gap-3">
        <span className="text-[13px] font-medium text-text-primary">{label}</span>
        {showPercent && (
          <span
            ref={pctRef}
            className="font-mono text-[12.5px] font-bold text-accent-green-text tabular-nums"
          >
            0%
          </span>
        )}
      </div>
      <div className="h-[5px] rounded-full bg-bg-subtle overflow-hidden">
        <div
          ref={fillRef}
          className="h-full w-full origin-left rounded-full bg-brand-gradient"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
}
