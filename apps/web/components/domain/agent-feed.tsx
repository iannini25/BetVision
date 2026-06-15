'use client'

import { useEffect, useRef } from 'react'
import { LiveDot } from '@/components/ui/live-dot'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

type FeedItem = {
  category: string
  categoryColor: string
  ago: string
  text: string
  source: string
  impact: string
}

const MOCK_FEED: FeedItem[] = [
  { category: 'LESÃO', categoryColor: '#FB4D6D', ago: 'há 12 min', text: 'Rüdiger sente a coxa no aquecimento; Schlotterbeck entrou na vaga.', source: 'Kicker', impact: 'cartões ALE ↑' },
  { category: 'ESCALAÇÃO', categoryColor: '#A78BFA', ago: 'há 34 min', text: 'Scaloni confirma Messi entre os titulares contra o Marrocos.', source: 'TyC Sports', impact: 'ARG vence ↑' },
  { category: 'SUSPENSÃO', categoryColor: '#FBBF24', ago: 'há 1 h', text: 'Tchouaméni cumpre suspensão; Camavinga deve ser titular pela França.', source: "L'Équipe", impact: 'meio-campo FRA' },
  { category: 'ESCALAÇÃO', categoryColor: '#A78BFA', ago: 'há 2 h', text: 'Ancelotti fecha treino e testa linha de cinco contra a Alemanha.', source: 'GE', impact: 'escanteios BRA ↓' },
]

type AgentFeedProps = {
  items?: FeedItem[]
}

export function AgentFeed({ items = MOCK_FEED }: AgentFeedProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Build the feed in sequence on mount: each item slides up + fades in, ~80ms
  // apart, so the panel reads as a live agent reporting one item at a time.
  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-feed-row]'))
    if (!rows.length) return

    const anim = staggerReveal(rows, { y: 14, duration: 620, delayStep: 80, ease: 'out(3)' })
    return () => {
      anim?.revert()
    }
  }, [items])

  // Avoid a flash of fully-painted rows before the stagger runs (transforms set
  // in CSS are invisible to anime.js from-value reads, so we hide via inline style
  // and let staggerReveal tween opacity/y back in). Reduced motion keeps them visible.
  const initialHidden = !prefersReducedMotion()

  return (
    <section className="bg-bg-secondary border border-border rounded-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <LiveDot />
        <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Últimas do agente</h2>
      </div>

      <div ref={listRef} className="flex flex-col gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            data-feed-row
            style={initialHidden ? { opacity: 0, borderColor: 'rgba(168,85,247,0.55)' } : { borderColor: 'rgba(168,85,247,0.55)' }}
            className="border-l-2 pl-3.5 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold tracking-wider rounded-md px-1.5 py-0.5"
                style={{
                  color: item.categoryColor,
                  background: `${item.categoryColor}18`,
                  border: `1px solid ${item.categoryColor}4D`,
                }}
              >
                {item.category}
              </span>
              <span className="text-[11px] text-text-muted">{item.ago}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-text-primary">{item.text}</p>
            <span className="text-[11px] text-text-muted">{item.source} · impacto: {item.impact}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
