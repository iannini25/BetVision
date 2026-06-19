'use client'

import { type ReactNode } from 'react'
import styles from './landing.module.css'
import { Calendar, Activity, Routing, Discover, Magicpen, Chart2 } from 'iconsax-reactjs'
import { useEyeAnchor } from './use-eye-anchor'
import { useRevealOnScroll } from './use-reveal-on-scroll'
import type { Icon as IconType } from 'iconsax-reactjs'

function Tile({ Icon, title, sub, className = '', children }: { Icon: IconType; title: string; sub: string; className?: string; children: ReactNode }) {
  return (
    <div data-reveal className={`relative flex flex-col gap-3 overflow-hidden rounded-card p-5 ${styles.glassPanel} ${styles.glassPanelHover} ${className}`}>
      <div className="flex items-center gap-2">
        <Icon size={17} color="currentColor" variant="Bulk" className="text-brand-soft" />
        <span className="text-[13px] font-semibold text-text-hi">{title}</span>
      </div>
      <div className="min-h-[68px] flex-1">{children}</div>
      <span className="text-[11.5px] text-text-mid">{sub}</span>
    </div>
  )
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-hi" />
    </span>
  )
}

export function BentoSection() {
  const sectionRef = useRevealOnScroll<HTMLElement>({ stagger: 0.08, duration: 0.6, start: 'top 70%', variant: 'blur-in' })
  // Ambient only — the orb glows faintly behind the grid, no morph.
  const ambient = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 0.14, radiusFactor: 0.5 })

  return (
    <section ref={sectionRef} id="bento" className={`relative mx-auto flex min-h-screen max-w-[1180px] flex-col justify-center gap-12 px-5 py-24 sm:px-8 ${styles.atmos}`}>
      <div ref={ambient} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2" />

      <h2 data-reveal className={`${styles.displayTitle} ${styles.displaySheen} max-w-[14ch] text-[clamp(2rem,4.6vw,3.6rem)]`}>
        Tudo num lugar só.
      </h2>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* Hoje — live ticker */}
        <Tile Icon={Calendar} title="Hoje" sub="Todos os jogos do dia. Ao vivo primeiro." className="col-span-2">
          <div className="flex items-center gap-2">
            <LiveDot />
            <div className="relative overflow-hidden">
              <div className="flex w-max gap-6 whitespace-nowrap font-mono text-[12px] text-text-secondary animate-ticker">
                {[0, 1].map((g) => (
                  <span key={g} className="flex gap-6">
                    <span><span className="text-accent-green-text">GOL</span> BRA 2×1 MAR 67′</span>
                    <span><span className="text-warn">CARTÃO</span> Kimmich</span>
                    <span><span className="text-brand-soft">VALOR</span> Over 2.5 +6,2%</span>
                    <span><span className="text-info">VAR</span> checagem</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Tile>

        {/* Match Center — mini ring */}
        <Tile Icon={Activity} title="Match Center" sub="O jogo inteiro, lance a lance.">
          <svg viewBox="0 0 60 60" className="h-16 w-16">
            <circle cx="30" cy="30" r="24" fill="none" stroke="var(--bg-card-2)" strokeWidth="5" />
            <circle cx="30" cy="30" r="24" fill="none" stroke="#A855F7" strokeWidth="5" strokeLinecap="round" transform="rotate(-90 30 30)" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - 0.72)} />
            <text x="30" y="34" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="13" fontWeight="700" fill="#F4F6FB">72</text>
          </svg>
        </Tile>

        {/* Radar — mini scatter */}
        <Tile Icon={Routing} title="Radar de Valor" sub="As divergências do dia.">
          <svg viewBox="0 0 90 60" className="h-16 w-full">
            <line x1="6" y1="54" x2="84" y2="54" stroke="rgba(148,163,255,0.2)" />
            <line x1="6" y1="54" x2="6" y2="6" stroke="rgba(148,163,255,0.2)" />
            {[[20,40],[34,30],[50,34],[64,20],[44,24],[28,44]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="2.2" fill="#A78BFA" opacity="0.7" />))}
            <circle cx="16" cy="16" r="3" fill="#4ADE80" />
            <circle cx="24" cy="20" r="3" fill="#4ADE80" />
          </svg>
        </Tile>

        {/* Explorar — mini entities */}
        <Tile Icon={Discover} title="Explorar" sub="Seleções, jogadores e árbitros.">
          <div className="flex gap-2">
            {['BRA', 'ARG', 'FRA'].map((t, i) => (
              <span key={t} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-bg-card-2 font-mono text-[10px] font-bold text-text-hi" style={{ marginLeft: i ? -8 : 0 }}>{t}</span>
            ))}
          </div>
        </Tile>

        {/* Chat — bubble */}
        <Tile Icon={Magicpen} title="Chat" sub="O agente, em qualquer tela.">
          <div className="flex flex-col gap-1.5">
            <span className="self-end rounded-card rounded-br-sm bg-brand-soft/15 px-2.5 py-1 text-[11px] text-text-hi">Vale 2,10?</span>
            <span className="self-start rounded-card rounded-bl-sm border border-line px-2.5 py-1 font-mono text-[11px] text-accent-hi">valor: alto · conf. média</span>
          </div>
        </Tile>

        {/* Performance — sparkline */}
        <Tile Icon={Chart2} title="Performance" sub="O modelo, aberto ao público." className="col-span-2">
          <svg viewBox="0 0 240 60" className="h-16 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(168,85,247,0.35)" />
                <stop offset="1" stopColor="rgba(168,85,247,0)" />
              </linearGradient>
            </defs>
            <path d="M0 46 L30 40 L60 44 L90 30 L120 34 L150 22 L180 26 L210 14 L240 18 L240 60 L0 60 Z" fill="url(#spark)" />
            <path d="M0 46 L30 40 L60 44 L90 30 L120 34 L150 22 L180 26 L210 14 L240 18" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Tile>
      </div>
    </section>
  )
}
