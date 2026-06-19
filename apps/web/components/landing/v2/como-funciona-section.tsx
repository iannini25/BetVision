'use client'

import { useEffect, useRef } from 'react'
import { animate, svg, onScroll, utils } from 'animejs'
import { Notification, Cpu, TickCircle } from 'iconsax-reactjs'
import { gsap } from './gsap-init'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useEyeAnchor } from './use-eye-anchor'
import { GradientWord, EditorialWord } from './highlight'
import styles from './landing.module.css'
import type { Icon as IconType } from 'iconsax-reactjs'

type Step = { n: string; Icon: IconType; title: string; desc: string }
const STEPS: Step[] = [
  { n: '01', Icon: Notification, title: 'O agente vigia', desc: '32 fontes, 24 horas por dia, 104 jogos.' },
  { n: '02', Icon: Cpu, title: 'O motor calcula', desc: 'Probabilidade real, recalculada a cada lance.' },
  { n: '03', Icon: TickCircle, title: 'Você decide', desc: 'Com clareza, valor e contexto. Nunca no escuro.' },
]

export function ComoFuncionaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const drawPathRef = useRef<SVGPathElement>(null)
  const reduced = useReducedMotion()
  // The orb settles on step 02 — it IS the engine that calculates.
  const engineAnchor = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 0.7, radiusFactor: 0.34 })

  useGSAP(
    () => {
      const items = sectionRef.current?.querySelectorAll<HTMLElement>('[data-reveal]')
      if (!items) return
      if (reduced) {
        gsap.set(items, { opacity: 1, y: 0 })
        return
      }
      gsap.from(items, {
        y: 28,
        opacity: 0,
        duration: 0.7,
        stagger: 0.14,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 66%', once: true },
      })
    },
    { scope: sectionRef }
  )

  // The connector DRAWS itself (real SVG strokeDashoffset) as the section enters — a process
  // line literally being traced, not a CSS bar scaling. anime.js v4, separate from the GSAP
  // card reveal so no element is animated by two systems.
  useEffect(() => {
    const path = drawPathRef.current
    const section = sectionRef.current
    if (!path || !section) return
    const line = svg.createDrawable(path)
    if (reduced) {
      utils.set(line, { draw: '0 1' })
      return
    }
    utils.set(line, { draw: '0 0' })
    const draw = animate(line, {
      draw: '0 1',
      ease: 'inOut(2)',
      duration: 1100,
      autoplay: onScroll({ target: section, enter: 'bottom-=120 top', sync: 'play', repeat: false }),
    })
    return () => {
      draw.revert()
    }
  }, [reduced])

  return (
    <section ref={sectionRef} id="como-funciona" className={`relative mx-auto flex min-h-screen max-w-[1180px] flex-col justify-center gap-14 px-5 py-24 sm:px-8 ${styles.atmos} ${styles.atmosGrid}`}>
      {/* white horizon accent over the grid — a crisp line that fades at both ends, marking the
          mesh without a hard edge. Decorative; the section itself stays transparent. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[43%] z-0 hidden h-px lg:block"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.34), transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 26%, #000 74%, transparent)',
          maskImage: 'linear-gradient(90deg, transparent, #000 26%, #000 74%, transparent)',
          boxShadow: '0 0 16px rgba(214, 200, 255, 0.25)',
        }}
      />
      <h2 data-reveal className={`${styles.displayTitle} ${styles.displaySheen} mx-auto max-w-[18ch] text-center text-[clamp(2rem,4.6vw,3.6rem)]`}>
        Vire o jogo com <GradientWord>informação</GradientWord>, não com <EditorialWord>sorte</EditorialWord>.
      </h2>

      <div className="relative">
        {/* connecting line (desktop) — a real SVG path that draws itself on scroll-in */}
        <svg
          aria-hidden
          viewBox="0 0 1000 4"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 right-0 top-[34px] hidden h-[2px] w-full lg:block"
        >
          <defs>
            <linearGradient id="cf-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8b5cf6" />
              <stop offset="0.5" stopColor="#a855f7" />
              <stop offset="1" stopColor="#d946ef" />
            </linearGradient>
          </defs>
          <path
            ref={drawPathRef}
            d="M0 2 H1000"
            stroke="url(#cf-line)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
          {STEPS.map((s, i) => (
            <div key={s.n} data-reveal className="relative flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
              <div ref={i === 1 ? engineAnchor : undefined} className="relative grid h-16 w-16 place-items-center rounded-full bg-brand-soft/[0.06]">
                <s.Icon size={26} color="currentColor" variant="Bulk" className="text-brand-soft" />
              </div>
              <span className="font-mono text-[13px] font-bold tracking-[0.2em] text-text-low">{s.n}</span>
              <h3 className="font-display text-xl font-bold text-text-hi">{s.title}</h3>
              <p className="max-w-[28ch] text-[14px] leading-relaxed text-text-mid">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
