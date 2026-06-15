'use client'

import { useRef } from 'react'
import type { Icon as IconType } from 'iconsax-reactjs'
import { gsap } from './gsap-init'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import styles from './landing.module.css'

type Props = {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  label: string
  Icon: IconType
}

/** A single market-stat tile whose number counts up once it scrolls into view. */
export function StatCountUp({ value, prefix = '', suffix = '', decimals = 0, label, Icon }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const render = (v: number) => {
        if (numRef.current) numRef.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`
      }
      if (reduced) {
        render(value)
        return
      }
      render(0)
      const obj = { v: 0 }
      gsap.to(obj, {
        v: value,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: () => render(obj.v),
        scrollTrigger: { trigger: ref.current, start: 'top 82%', once: true },
      })
    },
    { scope: ref, dependencies: [reduced] }
  )

  // a quick purple glow that tracks the cursor over the number
  function onNumMove(e: React.MouseEvent) {
    if (reduced) return
    const el = numRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--gx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--gy', `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      data-reveal
      className={`${styles.glassPanel} ${styles.glassPanelHover} flex flex-col items-center gap-3.5 rounded-card px-6 py-8 text-center`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft/[0.08]">
        <Icon size={30} color="currentColor" variant="Bulk" className="text-brand-soft" />
      </div>
      <span
        ref={numRef}
        onMouseMove={onNumMove}
        className={`${styles.statNum} font-mono text-[clamp(2.4rem,4.4vw,3.5rem)] font-extrabold tabular-nums text-text-hi`}
      >
        {prefix}
        {value.toFixed(decimals)}
        {suffix}
      </span>
      <span className="max-w-[22ch] text-sm leading-snug text-text-mid">{label}</span>
    </div>
  )
}
