'use client'

import { useEffect, useRef, useState } from 'react'
import { Magicpen } from 'iconsax-reactjs'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useEyeAnchor } from './use-eye-anchor'
import { useRevealOnScroll } from './use-reveal-on-scroll'
import { GradientWord } from './highlight'
import styles from './landing.module.css'

type Scenario = {
  q: string
  prob: number // model probability 0..1
  implied: number // odds-implied probability 0..1
  verdict: string
  confidence: 'média' | 'baixa'
  lowData?: boolean
}

const SCENARIOS: Scenario[] = [
  { q: 'Vale Brasil -1,5 a 2,10?', prob: 0.58, implied: 0.476, verdict: 'valor estimado: alto', confidence: 'média' },
  { q: 'Tem valor no Over 2,5 de Portugal × Espanha?', prob: 0.61, implied: 0.556, verdict: 'valor estimado: baixo', confidence: 'média' },
  { q: 'E num jogo de série inferior que ninguém cobre?', prob: 0, implied: 0, verdict: '', confidence: 'baixa', lowData: true },
]

function ProbInline({ value, label, tone = 'brand' }: { value: number; label: string; tone?: 'brand' | 'soft' }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-text-mid">{label}</span>
        <span className="font-mono text-[12px] font-semibold tabular-nums text-text-hi">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-card-2">
        <div className={`h-full rounded-full ${tone === 'brand' ? 'bg-brand-gradient' : 'bg-brand-soft'}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  )
}

function Answer({ s }: { s: Scenario }) {
  if (s.lowData) {
    return (
      <div className="flex flex-col gap-2 rounded-card border border-warn/25 bg-warn/[0.06] p-4">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-warn">confiança baixa</span>
        <p className="text-[13.5px] leading-relaxed text-text-secondary">
          Não tenho dados suficientes pra opinar com confiança aqui. Prefiro dizer que <strong className="text-text-hi">não sei</strong> a
          cravar no escuro. Sem cobertura, sem leitura.
        </p>
        <span className="font-mono text-[10px] text-text-low">não é recomendação.</span>
      </div>
    )
  }
  return (
    <div className={`${styles.glassPanel} flex flex-col gap-3 rounded-card p-4`}>
      <ProbInline value={s.prob} label="probabilidade estimada (modelo)" />
      <ProbInline value={s.implied} label="implícita na odd" tone="soft" />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="rounded-pill border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent-hi">
          {s.verdict}
        </span>
        <span className="rounded-pill border border-line px-2.5 py-0.5 font-mono text-[11px] text-text-mid">confiança {s.confidence}</span>
        <span className="ml-auto font-mono text-[10px] text-text-low">não é recomendação.</span>
      </div>
    </div>
  )
}

function ChatDemo() {
  const [active, setActive] = useState<number | null>(null)
  const [typing, setTyping] = useState(false)
  const interacted = useRef(false)
  const reduced = useReducedMotion()

  const run = (i: number) => {
    interacted.current = true
    setActive(i)
    if (reduced) {
      setTyping(false)
      return
    }
    setTyping(true)
    window.setTimeout(() => setTyping(false), 1100)
  }

  useEffect(() => {
    if (reduced) {
      setActive(0)
      return
    }
    const t = window.setTimeout(() => {
      if (!interacted.current) run(0)
    }, 3500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const s = active === null ? null : SCENARIOS[active]

  return (
    <div className={`${styles.glassPanel} ${styles.glassPanelHover} flex w-full flex-col gap-4 rounded-card p-5 sm:p-6`}>
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.q}
            onClick={() => run(i)}
            className={`rounded-pill border px-3 py-1.5 text-left text-[12px] transition-colors ${
              active === i ? 'border-brand-soft/50 bg-brand-soft/10 text-text-hi' : 'border-line text-text-mid hover:text-text-hi'
            }`}
          >
            {sc.q}
          </button>
        ))}
      </div>

      <div className="min-h-[200px] flex flex-col gap-3" aria-live="polite">
        {s && (
          <div className="flex justify-end">
            <span className="max-w-[80%] rounded-card rounded-br-sm bg-brand-soft/15 px-3.5 py-2 text-[13px] text-text-hi">{s.q}</span>
          </div>
        )}
        {s && (
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-white">
              <Magicpen size={15} color="currentColor" variant="Bold" />
            </span>
            <div className="min-w-0 flex-1">
              {typing ? (
                <div className="flex gap-1 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-mid [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-mid [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-mid" />
                </div>
              ) : (
                <Answer s={s} />
              )}
            </div>
          </div>
        )}
        {!s && <p className="py-8 text-center text-sm text-text-low">Toque numa pergunta para ver a leitura do agente.</p>}
      </div>
    </div>
  )
}

export function ChatSection() {
  const sectionRef = useRevealOnScroll<HTMLElement>({ stagger: 0.12, start: 'top 68%', variant: 'slide-x' })
  // The agent's eye rests dim beside the chat — present, not morphing. Kept low and away
  // from the headline so its glow never touches the H1.
  const eyeAnchor = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 0.26, radiusFactor: 0.16 })

  return (
    <section ref={sectionRef} id="chat" className={`relative mx-auto flex min-h-screen max-w-[1180px] items-center px-5 py-24 sm:px-8 ${styles.atmos} ${styles.atmosCalm}`}>
      <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <div className="relative flex flex-col gap-6">
          <div ref={eyeAnchor} aria-hidden className="pointer-events-none absolute -left-16 top-[62%] h-32 w-32" />
          <h2 data-reveal className={`${styles.displayTitle} ${styles.displaySheen} max-w-[14ch] text-[clamp(2rem,4.6vw,3.6rem)]`}>
            Cole a odd. Receba a <GradientWord>leitura</GradientWord>.
          </h2>
          <p data-reveal className="max-w-[50ch] text-[clamp(1rem,1.4vw,1.18rem)] leading-relaxed text-text-mid">
            Pergunte qualquer coisa, cole qualquer odd. O agente responde com probabilidade, fontes e contexto, e te
            diz, com todas as letras, quando <span className={styles.editorialWord}>não sabe</span>.
          </p>
          <p data-reveal className="font-mono text-[12px] text-text-low">
            Te diz onde tem valor e quando não tem confiança pra opinar. Informação, não recomendação.
          </p>
        </div>

        <div data-reveal>
          <ChatDemo />
        </div>
      </div>
    </section>
  )
}
