'use client'

import { AppHeader } from '@/components/layout/app-header'
import { GlassCard } from '@/components/ui/glass-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeam } from '@/hooks/use-matches'
import { FORM_COLORS } from '@betv/shared'

export default function SelecaoPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { data, isLoading } = useTeam(parseInt(id, 10))

  if (isLoading) {
    return (
      <>
        <AppHeader title="Selecao" userName="Leandro Firmino" />
        <div className="px-8 flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    )
  }

  const team = data?.team
  const players = data?.players ?? []
  if (!team) return <div className="p-8 text-text-secondary">Selecao nao encontrada.</div>

  const form = (team.form as string[]) || []

  return (
    <>
      <AppHeader title={team.name} userName="Leandro Firmino" />
      <div className="flex flex-col gap-5 px-8 animate-screenIn max-w-4xl">
        <GlassCard>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="font-display font-bold text-2xl">{team.name}</span>
              <span className="font-display font-bold text-lg text-text-muted">{team.shortName}</span>
              {team.group && (
                <span className="ml-auto text-xs font-semibold tracking-widest text-text-muted uppercase">
                  Grupo {team.group}
                </span>
              )}
            </div>
            <div className="flex items-center gap-8">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold tracking-wider text-text-muted">ELO</span>
                <span className="font-mono font-bold text-3xl tabular-nums">{team.elo}</span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-text-muted">FORMA</span>
                <div className="flex gap-1">
                  {form.map((f: string, i: number) => {
                    const colors = FORM_COLORS[f] || FORM_COLORS.D
                    return (
                      <span
                        key={i}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                      >
                        {f}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">Elenco</h3>
            {players.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum jogador cadastrado.</p>
            ) : (
              players.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                  <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                  <span className="text-xs text-text-muted">{p.position}</span>
                  {p.stats?.goalsPer90 != null && (
                    <span className="ml-auto font-mono text-xs text-text-secondary">
                      {p.stats.goalsPer90} gols/90
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </>
  )
}
