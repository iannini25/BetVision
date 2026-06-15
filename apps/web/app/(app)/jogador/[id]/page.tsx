'use client'

import { AppHeader } from '@/components/layout/app-header'
import { GlassCard } from '@/components/ui/glass-card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlayer } from '@/hooks/use-matches'

export default function JogadorPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { data, isLoading } = usePlayer(parseInt(id, 10))

  if (isLoading) {
    return (
      <>
        <AppHeader title="Jogador" userName="Leandro Firmino" />
        <div className="px-8 flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    )
  }

  const player = data?.player
  const team = data?.team
  if (!player) return <div className="p-8 text-text-secondary">Jogador nao encontrado.</div>

  const stats = player.stats as Record<string, number> | null

  return (
    <>
      <AppHeader title={player.name} userName="Leandro Firmino" />
      <div className="flex flex-col gap-5 px-8 animate-screenIn max-w-3xl">
        <GlassCard>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span className="font-display font-bold text-2xl">{player.name}</span>
              {team && (
                <span className="text-sm font-semibold text-text-muted">{team.shortName}</span>
              )}
              <span className="ml-auto text-xs text-text-muted">{player.position}</span>
            </div>
          </div>
        </GlassCard>

        {stats && (
          <GlassCard>
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">Estatisticas por 90 min</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.goalsPer90 != null && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold tracking-wider text-text-muted">GOLS/90</span>
                    <span className="font-mono font-bold text-2xl tabular-nums">{stats.goalsPer90}</span>
                  </div>
                )}
                {stats.xgPer90 != null && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold tracking-wider text-text-muted">XG/90</span>
                    <span className="font-mono font-bold text-2xl tabular-nums">{stats.xgPer90}</span>
                  </div>
                )}
                {stats.shotsPer90 != null && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold tracking-wider text-text-muted">CHUTES/90</span>
                    <span className="font-mono font-bold text-2xl tabular-nums">{stats.shotsPer90}</span>
                  </div>
                )}
                {stats.minutes != null && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold tracking-wider text-text-muted">MINUTOS</span>
                    <span className="font-mono font-bold text-2xl tabular-nums">{stats.minutes}</span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        )}

        {player.injury && (
          <GlassCard className="border-accent-red/20">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-widest text-accent-red uppercase">Situacao fisica</span>
              <p className="text-sm text-text-secondary">{(player.injury as any).description || (player.injury as any).status}</p>
            </div>
          </GlassCard>
        )}
      </div>
    </>
  )
}
