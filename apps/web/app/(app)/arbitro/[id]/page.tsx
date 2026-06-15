'use client'

import { AppHeader } from '@/components/layout/app-header'
import { GlassCard } from '@/components/ui/glass-card'
import { ProbBar } from '@/components/ui/prob-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { useReferee } from '@/hooks/use-matches'
import { RIGIDITY_LABELS } from '@betv/shared'

export default function ArbitroPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { data, isLoading } = useReferee(parseInt(id, 10))

  if (isLoading) {
    return (
      <>
        <AppHeader title="Arbitro" userName="Leandro Firmino" />
        <div className="px-8 flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-60 w-full" />
        </div>
      </>
    )
  }

  const referee = data?.referee
  const matches = data?.matches ?? []
  if (!referee) return <div className="p-8 text-text-secondary">Arbitro nao encontrado.</div>

  const rigidityKey = referee.rigidity >= 65 ? 'strict' : referee.rigidity >= 40 ? 'moderate' : 'lenient'
  const rigLabel = RIGIDITY_LABELS[rigidityKey]

  return (
    <>
      <AppHeader title={referee.name} userName="Leandro Firmino" />
      <div className="flex flex-col gap-5 px-8 animate-screenIn max-w-4xl">
        <GlassCard>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <span className="font-display font-bold text-2xl">{referee.name}</span>
                <span className="text-sm text-text-muted">{referee.country} · {referee.matchesAnalyzed} jogos analisados</span>
              </div>
              <span
                className="ml-auto text-xs font-bold tracking-wider rounded-md px-3 py-1"
                style={{
                  color: rigLabel.color,
                  background: `${rigLabel.color}18`,
                  border: `1px solid ${rigLabel.color}4D`,
                }}
              >
                {rigLabel.label}
              </span>
            </div>

            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex flex-col items-center gap-1">
                <span className="font-display font-extrabold text-4xl tabular-nums">
                  {referee.rigidity}<span className="text-lg text-text-secondary">%</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-text-muted">RIGIDEZ</span>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-text-muted">CARTOES/JOGO</span>
                  <span className="font-mono font-bold text-xl tabular-nums" style={{ color: referee.avgYellows >= 4 ? '#FBBF24' : '#F4F6FB' }}>
                    {referee.avgYellows}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-text-muted">VERMELHOS/JOGO</span>
                  <span className="font-mono font-bold text-xl tabular-nums">{referee.avgReds}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-text-muted">TAXA DE PENALTI</span>
                  <span className="font-mono font-bold text-xl tabular-nums">{(referee.penaltyRate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-text-muted">FALTAS/JOGO</span>
                  <span className="font-mono font-bold text-xl tabular-nums">{referee.avgFouls || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Como afeta os mercados</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {referee.rigidity >= 65
                ? `Com rigidez de ${referee.rigidity}%, ${referee.name} tende a produzir jogos com mais cartoes que a media. O modelo ajusta as probabilidades de mercados de cartoes para cima quando ele apita. A media de ${referee.avgYellows} amarelos por jogo esta acima da media geral da competicao.`
                : referee.rigidity >= 40
                  ? `${referee.name} tem perfil moderado (${referee.rigidity}% de rigidez). Media de ${referee.avgYellows} cartoes por jogo. O modelo aplica ajuste neutro, os mercados de cartoes sao pouco afetados.`
                  : `Com apenas ${referee.rigidity}% de rigidez, ${referee.name} e leniente. Media de ${referee.avgYellows} cartoes por jogo, abaixo da media. O modelo ajusta os mercados de cartoes para baixo quando ele apita.`
              }
            </p>
            <ProbBar label="Cartoes 4+" value={referee.rigidity >= 65 ? 0.72 : referee.rigidity >= 40 ? 0.55 : 0.38} />
            <ProbBar label="Cartoes 5+" value={referee.rigidity >= 65 ? 0.58 : referee.rigidity >= 40 ? 0.40 : 0.22} />
            <Disclaimer18 />
          </div>
        </GlassCard>

        {matches.length > 0 && (
          <GlassCard>
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">Jogos nesta copa</h3>
              {matches.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                  <span className="text-sm text-text-primary">{m.venue || 'Local TBD'}</span>
                  <span className="ml-auto font-mono text-xs text-text-muted">{m.status}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </>
  )
}
