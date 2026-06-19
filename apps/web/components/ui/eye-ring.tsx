'use client'

import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useInView } from '@/hooks/use-in-view'
import { useCountUp } from '@/hooks/use-count-up'

type EyeRingProps = {
  probability: number
  label: string
  sublabel: string
  size?: number
  /** Glide between values on live probability updates instead of snapping. */
  live?: boolean
}

export function EyeRing({ probability, sublabel, size = 128, live = false }: EyeRingProps) {
  const radius = size * 0.42
  const strokeWidth = size * 0.063
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const dotR = size * 0.039
  const pct = Math.round(probability * 100)

  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>({ once: !live })
  const arcRef = useRef<SVGCircleElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const pctRef = useCountUp<HTMLSpanElement>(pct, { live, onInView: !live, duration: 900 })
  const prev = useRef(0)
  const started = useRef(false)

  // The arc fills like a gauge (strokeDashoffset draw) and the position dot travels
  // along the ring to its resting angle; on live updates both glide old -> new so a
  // probability change reads as "the model just recalculated", not a hard jump.
  useEffect(() => {
    const arc = arcRef.current
    const dot = dotRef.current
    if (!arc || !dot) return
    const gated = live ? true : inView
    if (!gated) return
    if (started.current && !live) return

    const place = (p: number) => {
      arc.style.strokeDashoffset = String(circumference * (1 - p))
      const a = p * 2 * Math.PI - Math.PI / 2
      dot.setAttribute('cx', String(center + radius * Math.cos(a)))
      dot.setAttribute('cy', String(center + radius * Math.sin(a)))
    }

    if (reduced) {
      place(probability)
      prev.current = probability
      started.current = true
      return
    }

    const from = started.current ? prev.current : 0
    const obj = { p: from }
    place(from)
    const anim = animate(obj, {
      p: probability,
      duration: 900,
      ease: 'outExpo',
      onUpdate: () => place(obj.p),
    })
    prev.current = probability
    started.current = true
    return () => {
      anim.revert()
    }
  }, [probability, inView, reduced, live, circumference, center, radius])

  return (
    <div ref={wrapRef} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none" strokeWidth={strokeWidth}
          style={{ stroke: 'var(--bg-card-2)' }}
        />
        <circle
          ref={arcRef}
          cx={center} cy={center} r={radius}
          fill="none" stroke="url(#gBrand)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ filter: 'drop-shadow(var(--shadow-glow-brand))' }}
        />
        <circle
          ref={dotRef}
          cx={center} cy={center - radius} r={dotR}
          className="animate-dotGlow"
          style={{ fill: 'var(--accent-hi)', filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }}
        />
        <defs>
          <linearGradient id="gBrand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7C3AED" />
            <stop offset="0.45" stopColor="#A855F7" />
            <stop offset="1" stopColor="#D946EF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-px">
        <span className="font-display font-extrabold tabular-nums leading-none" style={{ fontSize: size * 0.23 }}>
          <span ref={pctRef}>0</span>
          <span className="text-text-secondary font-semibold" style={{ fontSize: size * 0.125 }}>%</span>
        </span>
        <span className="font-semibold text-text-muted tracking-wide" style={{ fontSize: size * 0.086 }}>
          {sublabel}
        </span>
      </div>
    </div>
  )
}
