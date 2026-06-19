'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Calendar, Activity, Chart2, type IconProps } from 'iconsax-reactjs'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import styles from './landing.module.css'

type Row = { label: string; value: number; suffix: string; tone: 'hi' | 'mid' | 'green'; tick?: boolean }
type Tab = {
  id: string
  label: string
  Icon: ComponentType<IconProps>
  match: string
  meta: string
  live?: boolean
  rows: Row[]
}

// Demonstration data only — labelled and disclaimed. Not live odds, not a recommendation.
const TABS: Tab[] = [
  {
    id: 'hoje',
    label: 'Hoje',
    Icon: Calendar,
    match: 'BRA × MAR',
    meta: 'Grupo C · hoje 16h',
    rows: [
      { label: 'Brasil vence', value: 72, suffix: '%', tone: 'hi', tick: true },
      { label: 'Over 2.5 gols', value: 81, suffix: '%', tone: 'mid', tick: true },
      { label: 'Ambas marcam', value: 58, suffix: '%', tone: 'mid', tick: true },
    ],
  },
  {
    id: 'aovivo',
    label: 'Ao vivo',
    Icon: Activity,
    match: 'BRA 2 × 1 MAR',
    meta: "67' · 2º tempo",
    live: true,
    rows: [
      { label: 'Brasil vence', value: 88, suffix: '%', tone: 'hi', tick: true },
      { label: 'Próximo gol: Brasil', value: 63, suffix: '%', tone: 'mid', tick: true },
      { label: 'Placar final 3 × 1', value: 21, suffix: '%', tone: 'mid', tick: true },
    ],
  },
  {
    id: 'valor',
    label: 'Valor',
    Icon: Chart2,
    match: 'POR × ESP',
    meta: 'amanhã · 13h',
    rows: [
      { label: 'Prob. do modelo (Over 2.5)', value: 61, suffix: '%', tone: 'hi', tick: true },
      { label: 'Implícita na odd', value: 55, suffix: '%', tone: 'mid' },
      { label: 'Valor estimado', value: 6.2, suffix: '%', tone: 'green', tick: true },
    ],
  },
]

const toneClass: Record<Row['tone'], string> = {
  hi: 'text-text-hi',
  mid: 'text-text-mid',
  green: 'text-accent-hi',
}
const barClass: Record<Row['tone'], string> = {
  hi: 'bg-brand-gradient',
  mid: 'bg-brand-soft/70',
  green: 'bg-accent',
}

function fmt(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

export function PreviewPredicao() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)
  // tiny per-row jitter so the numbers "tick" — reads as a live, working model
  const [jitter, setJitter] = useState<number[]>([0, 0, 0])
  const cardRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const tab = TABS[active]

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      setJitter(tab.rows.map((r) => (r.tick ? (Math.random() - 0.5) * 0.8 : 0)))
    }, 1400)
    return () => window.clearInterval(id)
  }, [reduced, tab])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = e.key === 'ArrowRight' ? (active + 1) % TABS.length : (active - 1 + TABS.length) % TABS.length
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  function onMove(e: React.MouseEvent) {
    if (reduced) return
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(px * 6).toFixed(2)}deg`)
  }
  function onLeave() {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div className={styles.previewWrap}>
      <div
        role="tablist"
        aria-label="Exemplos de predição"
        onKeyDown={onKeyDown}
        className={styles.previewTabs}
      >
        {TABS.map((t, i) => {
          const selected = i === active
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              role="tab"
              id={`pv-tab-${t.id}`}
              aria-selected={selected}
              aria-controls="pv-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={`${styles.previewTab} ${selected ? styles.previewTabActive : ''}`}
            >
              <t.Icon size={15} color="currentColor" variant={selected ? 'Bold' : 'Linear'} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div
        ref={cardRef}
        id="pv-panel"
        role="tabpanel"
        aria-labelledby={`pv-tab-${tab.id}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={styles.previewCard}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-display text-[15px] font-extrabold tracking-tight text-text-hi">{tab.match}</span>
            <span className="font-mono text-[11px] text-text-low">{tab.meta}</span>
          </div>
          {tab.live ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-[rgba(74,222,128,0.3)] bg-[rgba(34,197,94,0.08)] px-2.5 py-1">
              <span className={`h-1.5 w-1.5 rounded-full bg-accent-hi ${styles.dotGlow}`} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-hi">ao vivo</span>
            </span>
          ) : (
            <span className="rounded-pill border border-brand-soft/40 bg-brand-soft/[0.14] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-hi">
              demonstração
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
          {tab.rows.map((row, i) => {
            const shown = Math.max(0, row.value + (jitter[i] ?? 0))
            return (
              <div key={row.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] text-text-mid">{row.label}</span>
                  <span className={`font-mono text-[15px] font-bold tabular-nums ${toneClass[row.tone]}`}>
                    {row.tone === 'green' ? '+' : ''}
                    {fmt(shown)}
                    {row.suffix}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-card-2">
                  <div
                    className={`h-full rounded-full ${barClass[row.tone]} transition-[width] duration-700 ease-out`}
                    style={{ width: `${Math.min(100, shown)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] font-bold text-text-mid">18+</span>
          <span className="font-mono text-[10px] text-text-low">valor estimado · exemplo · não é recomendação</span>
        </div>
      </div>
    </div>
  )
}
