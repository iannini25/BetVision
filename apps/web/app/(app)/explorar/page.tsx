'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppHeader } from '@/components/layout/app-header'
import { GlassCard } from '@/components/ui/glass-card'
import { TeamCardSkeleton, RefereeCardSkeleton, PlayersTableSkeleton } from '@/components/ui/explore-skeletons'
import { FORM_COLORS } from '@betv/shared'
import { useExploreTeams, useExplorePlayers, useExploreReferees } from '@/hooks/use-matches'
import { useSession } from '@/hooks/use-session'

const TABS = ['Selecoes', 'Jogadores', 'Arbitros'] as const
type Tab = typeof TABS[number]

export default function ExplorarPage() {
  const [tab, setTab] = useState<Tab>('Selecoes')
  const [search, setSearch] = useState('')
  const { session } = useSession()

  const { data: teams, isLoading: loadingTeams } = useExploreTeams()
  const { data: players, isLoading: loadingPlayers } = useExplorePlayers()
  const { data: referees, isLoading: loadingRefs } = useExploreReferees()

  const filterByName = (items: any[] | undefined, key = 'name') =>
    items?.filter((i: any) => !search || i[key]?.toLowerCase().includes(search.toLowerCase())) ?? []

  return (
    <>
      <AppHeader title="Explorar" userName={session?.user?.name} />
      <div className="flex flex-col gap-5 px-8 animate-screenIn">
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex-1 min-w-[280px] flex items-center gap-2.5 bg-bg-secondary border border-border rounded-button px-4 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5F6B85" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm"
            />
          </div>
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`px-4 py-2 rounded-pill text-[13px] font-semibold cursor-pointer transition-all active:scale-[0.96] active:translate-y-0 ${
                  tab === t
                    ? 'bg-[rgba(139,92,246,0.15)] border border-[rgba(168,85,247,0.4)] text-brand-violet'
                    : 'bg-transparent border border-border text-text-secondary hover:border-border-hover'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === 'Selecoes' && (
          loadingTeams ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {[1,2,3,4,5,6].map(i => <TeamCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filterByName(teams).map((team: any) => (
                <Link href={`/selecao/${team.id}`} key={team.id} className="block transition-transform active:scale-[0.98] active:translate-y-0">
                  <GlassCard hover>
                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-base">{team.name}</span>
                        {team.group && <span className="ml-auto text-[11px] font-semibold tracking-wider text-text-muted">GRUPO {team.group}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold tracking-wider text-text-muted">ELO</span>
                          <span className="font-mono font-bold text-[22px] tabular-nums">{team.elo}</span>
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-semibold tracking-wider text-text-muted">FORMA</span>
                          <div className="flex gap-1">
                            {(team.form as string[] || []).map((f: string, i: number) => {
                              const c = FORM_COLORS[f] || FORM_COLORS.D
                              return <span key={i} className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{f}</span>
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === 'Jogadores' && (
          loadingPlayers ? <PlayersTableSkeleton /> : (
            <div className="bg-bg-card border border-border rounded-card overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[minmax(180px,1.4fr)_70px_repeat(4,minmax(80px,1fr))] gap-2 items-center px-5 py-3.5 border-b border-border">
                    {['JOGADOR', 'SEL', 'GOLS/90', 'XG/90', 'CHUTES/90', 'MIN'].map(h => (
                      <span key={h} className={`text-[11px] font-bold tracking-widest text-text-muted ${['GOLS/90','XG/90','CHUTES/90','MIN'].includes(h) ? 'text-right' : ''}`}>{h}</span>
                    ))}
                  </div>
                  {filterByName(players).map((p: any) => {
                    const s = p.stats as Record<string, number> | null
                    return (
                      <Link href={`/jogador/${p.id}`} key={p.id}>
                        <div className="grid grid-cols-[minmax(180px,1.4fr)_70px_repeat(4,minmax(80px,1fr))] gap-2 items-center px-5 py-3 border-b border-border-subtle hover:bg-bg-subtle transition-[background-color,transform] cursor-pointer active:scale-[0.99] active:translate-y-0 active:bg-bg-subtle">
                          <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                          <span className="text-xs font-bold text-text-secondary">{p.team?.shortName ?? '·'}</span>
                          <span className="font-mono text-[13px] text-right text-text-primary">{s?.goalsPer90?.toFixed(2) ?? '·'}</span>
                          <span className="font-mono text-[13px] text-right text-text-primary">{s?.xgPer90?.toFixed(2) ?? '·'}</span>
                          <span className="font-mono text-[13px] text-right text-text-primary">{s?.shotsPer90?.toFixed(1) ?? '·'}</span>
                          <span className="font-mono text-[13px] text-right text-text-secondary">{s?.minutes ?? '·'}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border">
                <span className="text-[11px] text-text-muted">Estatisticas normalizadas por 90 minutos</span>
              </div>
            </div>
          )
        )}

        {tab === 'Arbitros' && (
          loadingRefs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {[1,2,3,4,5,6].map(i => <RefereeCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filterByName(referees).map((ref: any) => {
                const rigLabel = ref.rigidity >= 65 ? { l: 'RIGIDO', c: '#FB4D6D' } : ref.rigidity >= 40 ? { l: 'MODERADO', c: '#FBBF24' } : { l: 'LENIENTE', c: '#4ADE80' }
                return (
                  <Link href={`/arbitro/${ref.id}`} key={ref.id} className="block transition-transform active:scale-[0.98] active:translate-y-0">
                    <GlassCard hover>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-display font-bold text-base">{ref.name}</span>
                            <span className="text-xs text-text-muted">{ref.country} · {ref.matchesAnalyzed} jogos</span>
                          </div>
                          <span className="ml-auto text-[10px] font-bold tracking-wider rounded-md px-2 py-0.5" style={{ color: rigLabel.c, background: `${rigLabel.c}18`, border: `1px solid ${rigLabel.c}4D` }}>{rigLabel.l}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-display font-extrabold text-xl tabular-nums">{ref.rigidity}<span className="text-xs text-text-secondary">%</span></span>
                            <span className="text-[9px] font-semibold tracking-wider text-text-muted">RIGIDEZ</span>
                          </div>
                          <div className="flex-1 flex flex-col gap-2.5">
                            <div className="flex justify-between"><span className="text-xs text-text-secondary">Cartoes/jogo</span><span className="font-mono text-[13px] font-bold" style={{ color: ref.avgYellows >= 4 ? '#FBBF24' : '#F4F6FB' }}>{ref.avgYellows}</span></div>
                            <div className="flex justify-between"><span className="text-xs text-text-secondary">Penaltis</span><span className="font-mono text-[13px] font-semibold text-text-primary">{ref.penaltyRate ? `${(ref.penaltyRate * 100).toFixed(0)}%` : '·'}</span></div>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                )
              })}
            </div>
          )
        )}
      </div>
    </>
  )
}
