'use client'

import { useEffect, useRef } from 'react'
import { animate, stagger, utils, type Target } from 'animejs'
import { AppHeader } from '@/components/layout/app-header'
import { LiveDot } from '@/components/ui/live-dot'
import { EyeRing } from '@/components/ui/eye-ring'
import { ProbBar } from '@/components/ui/prob-bar'
import { GlassCard } from '@/components/ui/glass-card'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function MatchCenterPage() {
  const statsRef = useRef<HTMLDivElement>(null)
  const eventsRef = useRef<HTMLDivElement>(null)

  // Stat fills grow via scaleX (transform only); events build in via staggerReveal.
  useEffect(() => {
    const reduced = prefersReducedMotion()

    const bars = statsRef.current?.querySelectorAll<HTMLElement>('[data-statbar]')
    const animations: Array<{ revert: () => void }> = []

    if (bars && bars.length) {
      if (reduced) {
        bars.forEach((bar) => {
          const fill = Number(bar.dataset.fill ?? 0)
          utils.set(bar, { scaleX: fill })
        })
      } else {
        const anim = animate(bars, {
          scaleX: (el?: Target) => [0, Number((el as HTMLElement).dataset.fill ?? 0)],
          duration: 760,
          delay: stagger(50),
          ease: 'out(3)',
        })
        animations.push(anim)
      }
    }

    const eventRows = eventsRef.current?.querySelectorAll<HTMLElement>('[data-event]')
    if (eventRows && eventRows.length) {
      const reveal = staggerReveal(eventRows, { y: 10, delayStep: 55 })
      if (reveal) animations.push(reveal)
    }

    return () => {
      animations.forEach((a) => a.revert())
    }
  }, [])

  // Mock data, would come from API
  const match = {
    homeTeam: 'BRA',
    awayTeam: 'ALE',
    homeScore: 2,
    awayScore: 1,
    minute: 67,
    status: 'live',
    group: 'C',
    phase: 'Fase de grupos',
    venue: 'MetLife Stadium',
    city: 'Nova Jersey',
    referee: 'Facundo Tello',
  }

  return (
    <>
      <AppHeader title="Match Center" userName="Leandro Firmino" />
      <div className="flex flex-col gap-5 px-8 animate-screenIn">
        {/* Match header */}
        <GlassCard className="border-l-[3px] border-l-accent-green">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-semibold tracking-widest text-text-muted uppercase">
                Grupo {match.group} · {match.phase} · {match.venue}, {match.city}
              </span>
              <span className="ml-auto flex items-center gap-2 bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.35)] rounded-pill px-3 py-1">
                <LiveDot />
                <span className="text-xs font-bold tracking-wider text-accent-green-text">AO VIVO</span>
                <span className="font-mono text-xs font-semibold text-accent-green-text animate-blinkMin">{match.minute}&apos;</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-10">
              <span className="font-display font-bold text-xl">{match.homeTeam}</span>
              <span className="font-display font-extrabold text-5xl tabular-nums">
                {match.homeScore}<span className="text-text-muted font-semibold px-3">×</span>{match.awayScore}
              </span>
              <span className="font-display font-bold text-xl text-text-secondary">{match.awayTeam}</span>
            </div>
            <div className="text-center text-[11px] font-semibold text-text-muted tracking-widest">2o TEMPO</div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Probabilities */}
          <GlassCard>
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Probabilidades ao vivo</h3>
              <div className="flex justify-center">
                <EyeRing probability={0.72} label="72%" sublabel="BRA VENCE" size={140} />
              </div>
              <div className="flex flex-col gap-3">
                <ProbBar label="BRA vence" value={0.72} />
                <ProbBar label="Empate" value={0.14} />
                <ProbBar label="ALE vence" value={0.14} />
              </div>
              <div className="border-t border-border-subtle pt-3 flex flex-col gap-3">
                <ProbBar label="Over 2.5 gols" value={0.81} />
                <ProbBar label="Ambas marcam" value={0.65} />
                <ProbBar label="Escanteios 9+" value={0.64} />
                <ProbBar label="Cartões 4+" value={0.58} />
              </div>
              <Disclaimer18 />
            </div>
          </GlassCard>

          {/* Live stats */}
          <div className="flex flex-col gap-5">
            <GlassCard>
              <div ref={statsRef} className="flex flex-col gap-3">
                <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Estatísticas ao vivo</h3>
                {[
                  { label: 'Posse de bola', home: 54, away: 46 },
                  { label: 'Chutes', home: 12, away: 8 },
                  { label: 'No alvo', home: 6, away: 3 },
                  { label: 'Escanteios', home: 7, away: 4 },
                  { label: 'Faltas', home: 9, away: 13 },
                ].map((stat) => {
                  const total = stat.home + stat.away
                  const homeFill = total ? stat.home / total : 0
                  const awayFill = total ? stat.away / total : 0
                  return (
                    <div key={stat.label} className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-text-primary w-8 text-right">{stat.home}</span>
                      <div className="flex-1 flex gap-1">
                        {/* Home bar grows from the centre (origin-right) so the two meet in the middle. */}
                        <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden flex justify-end">
                          <div
                            data-statbar
                            data-fill={homeFill}
                            className="h-full w-full origin-right rounded-full bg-brand-gradient will-change-transform"
                            style={{ transform: 'scaleX(0)' }}
                          />
                        </div>
                        <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden">
                          <div
                            data-statbar
                            data-fill={awayFill}
                            className="h-full w-full origin-left rounded-full bg-text-muted/30 will-change-transform"
                            style={{ transform: 'scaleX(0)' }}
                          />
                        </div>
                      </div>
                      <span className="font-mono text-sm font-semibold text-text-secondary w-8">{stat.away}</span>
                      <span className="text-[11px] text-text-muted w-20">{stat.label}</span>
                    </div>
                  )
                })}
              </div>
            </GlassCard>

            {/* Events timeline */}
            <GlassCard>
              <div ref={eventsRef} className="flex flex-col gap-3">
                <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Eventos</h3>
                {[
                  { min: 62, type: 'goal', text: 'GOL · Vinícius Jr. (BRA)', color: '#4ADE80' },
                  { min: 64, type: 'card', text: 'Cartão amarelo · Kimmich (ALE)', color: '#FBBF24' },
                  { min: 58, type: 'var', text: 'VAR · checagem de pênalti, nada marcado', color: '#38BDF8' },
                  { min: 41, type: 'card', text: 'Cartão amarelo · Kimmich (ALE)', color: '#FBBF24' },
                  { min: 34, type: 'goal', text: 'GOL · Musiala (ALE)', color: '#4ADE80' },
                  { min: 23, type: 'goal', text: 'GOL · Rodrygo (BRA)', color: '#4ADE80' },
                ].map((e, i) => (
                  <div key={i} data-event className="flex items-center gap-3 will-change-transform">
                    <span className="font-mono text-xs text-text-muted w-8 text-right">{e.min}&apos;</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
                    <span className="text-[13px] text-text-primary">{e.text}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </>
  )
}
