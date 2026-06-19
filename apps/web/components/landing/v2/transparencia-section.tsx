'use client'

import { useRef } from 'react'
import { ShieldTick, TickCircle } from 'iconsax-reactjs'
import { gsap } from './gsap-init'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useEyeAnchor } from './use-eye-anchor'
import { EditorialWord } from './highlight'
import styles from './landing.module.css'

// Public log strip — deterministic so SSR/CSR match. ~76% hits ("exemplo").
const LOG = '✓✓✗✓✓✓✗✓✓✗✓✓✓✓✗✓✓✓✗✓✓✓✓✗'.split('')

export function TransparenciaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  // No morph here: the eye rests, dim. Credibility comes from calm, not spectacle.
  const restAnchor = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 0.12, radiusFactor: 0.5 })

  useGSAP(
    () => {
      const items = sectionRef.current?.querySelectorAll<HTMLElement>('[data-reveal]')
      const marks = sectionRef.current?.querySelectorAll<HTMLElement>('[data-mark]')
      if (reduced) {
        if (items) gsap.set(items, { opacity: 1, y: 0 })
        if (marks) gsap.set(marks, { opacity: 1 })
        return
      }
      if (items)
        gsap.from(items, {
          y: 22,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
        })
      if (marks)
        gsap.from(marks, {
          opacity: 0,
          duration: 0.4,
          stagger: 0.04,
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 55%', once: true },
        })
    },
    { scope: sectionRef }
  )

  return (
    <section ref={sectionRef} id="transparencia" className={`relative mx-auto flex min-h-screen max-w-[1000px] flex-col items-center justify-center gap-8 px-5 py-24 text-center sm:px-8 ${styles.atmos} ${styles.atmosCalm}`}>
      <div ref={restAnchor} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2" />

      <span data-reveal className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.16em] text-text-low">
        <ShieldTick size={16} color="currentColor" variant="Bulk" /> Transparência
      </span>
      <h2 data-reveal className={`${styles.displayTitle} ${styles.displaySheen} max-w-[18ch] text-[clamp(2rem,4.6vw,3.6rem)]`}>
        Nossos acertos e <EditorialWord>erros</EditorialWord>. Em público.
      </h2>
      <p data-reveal className="max-w-[58ch] text-[clamp(1rem,1.4vw,1.18rem)] leading-relaxed text-text-mid">
        Quem promete lucro está mentindo. A gente mostra a conta. Cada previsão fica registrada, acertos e erros,
        com Brier score, aberta a qualquer um.
      </p>

      {/* public ledger — the accountability surface, one matte-glass panel */}
      <div data-reveal className={`${styles.glassPanel} flex w-full max-w-[40rem] flex-col items-center gap-8 rounded-card px-6 py-10 sm:px-10`}>
        {/* public calibration strip */}
        <div className="flex max-w-[36rem] flex-wrap justify-center gap-1.5">
          {LOG.map((m, i) => (
            <span
              key={i}
              data-mark
              className={`grid h-6 w-6 place-items-center rounded-md border font-mono text-[12px] ${
                m === '✓' ? 'border-accent/25 bg-accent/[0.07] text-accent-green-text' : 'border-danger/25 bg-danger/[0.06] text-danger'
              }`}
            >
              {m === '✓' ? <TickCircle size={13} color="currentColor" variant="Bold" /> : '✗'}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-center gap-x-10 gap-y-4">
          {[
            { v: '61%', l: 'de acerto' },
            { v: '142', l: 'previsões registradas' },
            { v: '0,21', l: 'Brier score' },
          ].map((s) => (
            <div key={s.l} className="flex flex-col items-center">
              <span className="font-mono text-[clamp(1.8rem,3vw,2.6rem)] font-bold tabular-nums text-text-hi">{s.v}</span>
              <span className="text-[12px] text-text-mid">{s.l}</span>
            </div>
          ))}
        </div>
        <p className="font-mono text-[11px] text-text-low">
          Números de exemplo. Probabilidade não é certeza. Conteúdo informativo, não recomendação.
        </p>
      </div>
    </section>
  )
}
