'use client'

import { useEffect, useRef, useState } from 'react'
import { LiveDot } from '@/components/ui/live-dot'
import { TICKER_EVENT_COLORS } from '@betv/shared'
import { staggerReveal } from '@/lib/motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

type TickerItem = {
  type: string
  label: string
  minute?: number
  text: string
  /** For odds movements: the open/current odds and which way it moved. */
  odds?: { from: number; to: number }
}

const MOCK_TICKER: TickerItem[] = [
  { type: 'goal', label: 'GOL', minute: 67, text: 'BRA 2×1 ALE · Vinícius Jr.' },
  { type: 'card', label: 'CARTÃO', minute: 64, text: 'Kimmich (ALE)' },
  { type: 'odds', label: 'ODDS', text: 'BRA vence', odds: { from: 1.48, to: 1.42 } },
  { type: 'var', label: 'VAR', minute: 58, text: 'checagem de pênalti · nada marcado' },
  { type: 'corner', label: 'ESCANTEIO', minute: 62, text: 'Brasil (7º no jogo)' },
  { type: 'odds', label: 'ODDS', text: 'Over 2.5', odds: { from: 1.83, to: 1.91 } },
  { type: 'model', label: 'MODELO', text: 'Over 2.5 recalculado: 81%' },
]

type LiveTickerProps = {
  items?: TickerItem[]
}

/** Odds that drifted DOWN are firming (value/likelier) -> green; UP -> danger. */
function OddsValue({ odds }: { odds: { from: number; to: number } }) {
  const down = odds.to < odds.from
  const color = down ? 'text-accent-green-text' : 'text-danger'
  const arrow = down ? '↓' : '↑'
  return (
    <span className="flex items-center gap-1.5 tabular-nums">
      <span className="font-mono text-text-muted">{odds.from.toFixed(2)}</span>
      <span className="text-text-muted">→</span>
      <span className={`font-mono font-semibold ${color}`}>
        {odds.to.toFixed(2)} {arrow}
      </span>
    </span>
  )
}

function TickerEntry({ item }: { item: TickerItem }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="font-bold text-[11px] tracking-wider"
        style={{ color: TICKER_EVENT_COLORS[item.type] || '#A78BFA' }}
      >
        {item.label}
      </span>
      {item.minute !== undefined && (
        <span className="font-mono text-text-muted tabular-nums">{item.minute}&apos;</span>
      )}
      <span className={item.type === 'goal' ? 'text-text-primary font-medium' : ''}>
        {item.text}
      </span>
      {item.odds && <OddsValue odds={item.odds} />}
    </span>
  )
}

export function LiveTicker({ items = MOCK_TICKER }: LiveTickerProps) {
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const staticListRef = useRef<HTMLDivElement>(null)

  // Reduced motion: no scroll. Build a static stacked list once on mount instead.
  useEffect(() => {
    if (!reduced || !staticListRef.current) return
    const rows = Array.from(staticListRef.current.querySelectorAll<HTMLElement>('[data-ticker-row]'))
    if (rows.length) staggerReveal(rows, { y: 8, duration: 420, delayStep: 50 })
  }, [reduced])

  if (reduced) {
    return (
      <div className="border border-border bg-bg-secondary rounded-input overflow-hidden">
        <div className="flex items-center gap-1.5 px-3.5 py-2 bg-[rgba(34,197,94,0.08)] border-b border-border">
          <LiveDot />
          <span className="text-[11px] font-bold tracking-widest text-accent-green-text">AO VIVO</span>
        </div>
        <div ref={staticListRef} className="flex flex-col divide-y divide-border-subtle">
          {items.map((item, i) => (
            <div key={i} data-ticker-row className="px-3.5 py-2 text-[13px] text-text-secondary">
              <TickerEntry item={item} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="border border-border bg-bg-secondary rounded-input flex items-center overflow-hidden h-[38px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex-none flex items-center gap-1.5 px-3.5 h-full bg-[rgba(34,197,94,0.08)] border-r border-border">
        <LiveDot />
        <span className="text-[11px] font-bold tracking-widest text-accent-green-text">AO VIVO</span>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden relative">
        <div
          className="flex gap-0 w-max animate-ticker"
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
        >
          {[items, items].map((group, gi) => (
            <div key={gi} className="flex items-center gap-7 px-7 whitespace-nowrap text-[13px] text-text-secondary">
              {group.map((item, i) => (
                <TickerEntry key={`${gi}-${i}`} item={item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
