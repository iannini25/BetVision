'use client'

import { AppHeader } from '@/components/layout/app-header'
import { GlassCard } from '@/components/ui/glass-card'
import { ProbBar } from '@/components/ui/prob-bar'
import { KpiCardSkeleton, ProbBarSkeleton } from '@/components/ui/explore-skeletons'
import { useCountUp } from '@/hooks/use-count-up'
import { useModelPerformance } from '@/hooks/use-matches'
import { useSession } from '@/hooks/use-session'
import { MARKET_LABELS } from '@betv/shared'

export default function ModeloPage() {
  const { data, isLoading } = useModelPerformance()
  const { session } = useSession()

  const totalPreds = data?.totalPredictions ?? 0
  const accuracy = data?.accuracy ?? 0
  const brier = data?.brierScore ?? 0
  const byMarket = data?.byMarket ?? []
  const recent = data?.recentPredictions ?? []

  // KPI count-ups (gated on in-view; reduced-motion snaps inside the hook).
  const totalPredsRef = useCountUp<HTMLSpanElement>(totalPreds)
  const accuracyRef = useCountUp<HTMLSpanElement>(Math.round(accuracy * 100))
  const brierRef = useCountUp<HTMLSpanElement>(brier, { decimals: 3 })

  return (
    <>
      <AppHeader title="Modelo" userName={session?.user?.name} />
      <div className="flex flex-col gap-5 px-8 animate-screenIn">
        <div className="flex flex-col gap-1.5 max-w-[720px]">
          <span className="text-xs font-bold tracking-widest text-brand-light uppercase">Transparencia</span>
          <h2 className="font-display font-bold text-[30px] tracking-tight leading-tight">
            Nossos acertos e erros, em publico.
          </h2>
          <p className="text-[14.5px] text-text-secondary leading-relaxed">
            Toda previsao do modelo fica registrada e e confrontada com o resultado real.
            Sem apagar historico, sem esconder os erros.
          </p>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="sm:col-span-2"><KpiCardSkeleton /></div>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              <div className="bg-bg-card border border-border rounded-card p-5 flex flex-col gap-4">
                {[0, 1, 2, 3].map((i) => <ProbBarSkeleton key={i} />)}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Hero metric (Acerto geral) spans wider and reads larger than the two supporting KPIs. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <GlassCard className="sm:col-span-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-widest text-text-muted uppercase">Acerto geral</span>
                  <span className="font-display font-extrabold text-[52px] leading-none tabular-nums text-accent-green-text">
                    <span ref={accuracyRef}>0</span><span className="text-2xl text-text-secondary align-top">%</span>
                  </span>
                  <span className="text-xs text-text-muted">previsoes com prob. &ge; 55%</span>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-widest text-text-muted uppercase">Previsoes liquidadas</span>
                  <span ref={totalPredsRef} className="font-display font-extrabold text-[34px] tabular-nums">0</span>
                  <span className="text-xs text-text-muted">desde 01/06/2026</span>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-widest text-text-muted uppercase">Brier score</span>
                  <span ref={brierRef} className="font-display font-extrabold text-[34px] tabular-nums">0.000</span>
                  <span className="text-xs text-text-muted">quanto menor, melhor</span>
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              <GlassCard>
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Acuracia por mercado</h3>
                  {byMarket.length === 0 && <p className="text-sm text-text-muted">Sem dados suficientes.</p>}
                  {byMarket.map((a: any) => (
                    <div key={a.market} className="flex flex-col gap-1.5">
                      <ProbBar label={MARKET_LABELS[a.market] || a.market} value={a.accuracy} />
                      <span className="text-[11px] text-text-muted">{a.total} previsoes</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <div className="flex flex-col gap-3.5">
                <section className="bg-[rgba(139,92,246,0.06)] backdrop-blur-xl border border-border rounded-card p-5 flex flex-col gap-2.5">
                  <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">O que e Brier score?</h3>
                  <p className="text-[13.5px] text-text-secondary leading-relaxed">
                    E a distancia entre o que o modelo previu e o que aconteceu. Se dissemos{' '}
                    <span className="text-text-primary font-semibold">80%</span> e o evento aconteceu, a distancia e pequena;
                    se nao aconteceu, e grande. Um modelo que sempre chuta 50% fica em{' '}
                    <span className="font-mono text-text-primary">0.250</span>. Perfeicao e{' '}
                    <span className="font-mono text-text-primary">0</span>. Estamos em{' '}
                    <span className="font-mono text-accent-green-text font-bold">{brier.toFixed(3)}</span>, melhor que o chute,
                    longe da bola de cristal.
                  </p>
                </section>

                <GlassCard>
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Ultimas previsoes liquidadas</h3>
                    {recent.length === 0 && <p className="text-sm text-text-muted">Sem previsoes liquidadas ainda.</p>}
                    {recent.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] text-text-muted flex-none w-11">
                          {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '·'}
                        </span>
                        <span className="flex-1 text-[13px] text-text-primary">
                          {r.outcome} <span className="font-mono text-text-secondary">({Math.round(r.predictedProb * 100)}%)</span>
                        </span>
                        <span className={`text-[13px] font-bold ${r.actualResult ? 'text-accent-green-text' : 'text-accent-red'}`}>
                          {r.actualResult ? '\u2713' : '\u2717'}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
