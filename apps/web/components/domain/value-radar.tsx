'use client'

import { useEffect, useRef } from 'react'
import { animate, stagger, utils } from 'animejs'
import { LiveDot } from '@/components/ui/live-dot'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { useCountUp } from '@/hooks/use-count-up'
import { useInView } from '@/hooks/use-in-view'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

type ValueItem = {
  market: string
  outcome: string
  matchLabel: string
  modelProb: number
  bestOdds: number
  edge: number
  isLive?: boolean
}

const MOCK_VALUES: ValueItem[] = [
  { market: 'over_under_2_5', outcome: 'Over 2.5 gols', matchLabel: 'ARG × MAR', modelProb: 0.68, bestOdds: 1.62, edge: 0.062 },
  { market: 'corners_over_9_5', outcome: 'Escanteios 10+', matchLabel: 'BRA × ALE', modelProb: 0.57, bestOdds: 1.95, edge: 0.058, isLive: true },
  { market: 'btts', outcome: 'Ambas marcam', matchLabel: 'FRA × NOR', modelProb: 0.54, bestOdds: 2.05, edge: 0.051 },
  { market: 'cards_over_4_5', outcome: 'Cartões 5+', matchLabel: 'POR × COL', modelProb: 0.48, bestOdds: 2.30, edge: 0.046 },
]

/**
 * One opportunity row. The green +edge% pill is the product payoff, so it gets
 * privileged motion: it counts up (useCountUp) and pops (scale 1 -> 1.12 -> 1)
 * the moment the row enters view. The probability bar is filled by the parent's
 * staggered scaleX animation (a compositor-friendly transform, not a width tween).
 */
function ValueRow({ item }: { item: ValueItem }) {
  const [rowRef, inView] = useInView<HTMLDivElement>({ amount: 0.4 })
  const pillRef = useRef<HTMLSpanElement>(null)
  // Count up the edge percentage (e.g. 6.2). live:false, but gated on view via the pop.
  const edgeRef = useCountUp<HTMLSpanElement>(item.edge * 100, {
    decimals: 1,
    prefix: '+',
    suffix: '%',
    duration: 1000,
  })

  useEffect(() => {
    const el = pillRef.current
    if (!el || !inView || prefersReducedMotion()) return
    const anim = animate(el, {
      scale: [1, 1.12, 1],
      duration: 720,
      delay: 220,
      ease: 'out(3)',
    })
    return () => {
      anim.revert()
    }
  }, [inView])

  // Hide until the parent's mount stagger paints the row in (transforms set in CSS
  // are invisible to anime.js from-value reads, so we avoid a fully-opaque flash).
  const initialHidden = !prefersReducedMotion()

  return (
    <div
      ref={rowRef}
      data-radar-row
      style={initialHidden ? { opacity: 0 } : undefined}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[13.5px] font-semibold text-text-primary flex items-center gap-1.5">
          {item.outcome}
          {item.isLive && <LiveDot size={6} />}
        </span>
        <span
          ref={pillRef}
          className="ml-auto font-mono text-xs font-bold text-accent-green-text border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.07)] rounded-pill px-2.5 py-0.5 tabular-nums origin-center"
        >
          <span ref={edgeRef}>+{(item.edge * 100).toFixed(1)}%</span>
        </span>
      </div>
      <span className="text-[11.5px] text-text-muted">
        {item.matchLabel} · modelo <span className="font-mono text-text-secondary">{Math.round(item.modelProb * 100)}%</span> · melhor odd <span className="font-mono text-text-secondary">{item.bestOdds.toFixed(2)}</span>
      </span>
      <div className="h-1 rounded-full bg-bg-subtle overflow-hidden">
        <div
          data-radar-bar
          className="h-full w-full rounded-full bg-brand-gradient"
          style={{
            transform: `scaleX(${initialHidden ? 0 : item.modelProb})`,
            transformOrigin: 'left',
          }}
        />
      </div>
    </div>
  )
}

type ValueRadarProps = {
  items?: ValueItem[]
}

export function ValueRadar({ items = MOCK_VALUES }: ValueRadarProps) {
  const sectionRef = useRef<HTMLElement>(null)

  // On mount: stagger the rows up, then sweep each probability bar from empty to
  // its model probability via scaleX (transform-origin: left), never width, so the
  // fill runs on the compositor. Both snap to final under reduced motion.
  useEffect(() => {
    const root = sectionRef.current
    if (!root) return

    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-radar-row]'))
    const bars = Array.from(root.querySelectorAll<HTMLElement>('[data-radar-bar]'))

    const reduced = prefersReducedMotion()

    // Seed each bar's start state. CSS-class transforms are invisible to anime.js
    // from-value reads, so we set the scaleX target explicitly per bar before tweening.
    const targets = items.map((it) => it.modelProb)
    if (reduced) {
      bars.forEach((bar, i) => {
        utils.set(bar, { scaleX: targets[i] ?? 0, transformOrigin: 'left' })
      })
      utils.set(rows, { opacity: 1, y: 0 })
      return
    }

    utils.set(bars, { scaleX: 0, transformOrigin: 'left' })

    const rowAnim = staggerReveal(rows, { y: 12, duration: 600, delayStep: 90, ease: 'out(3)' })
    const barAnim = animate(bars, {
      // Function value -> per-target end (an array here would be read as keyframes).
      scaleX: (_el: HTMLElement, i: number) => targets[i] ?? 0,
      duration: 900,
      delay: stagger(90, { start: 160 }),
      ease: 'out(3)',
    })

    return () => {
      rowAnim?.revert()
      barAnim.revert()
    }
  }, [items])

  return (
    <section ref={sectionRef} className="bg-[rgba(139,92,246,0.06)] backdrop-blur-xl border border-border rounded-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4" />
          <path d="M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2" />
        </svg>
        <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Radar de Valor</h2>
        <span className="ml-auto text-[11px] text-text-muted">hoje</span>
      </div>

      {items.map((item, i) => (
        <ValueRow key={i} item={item} />
      ))}

      <Disclaimer18 />
    </section>
  )
}
