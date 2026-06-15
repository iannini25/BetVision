'use client'

import { AppHeader } from '@/components/layout/app-header'
import { LiveTicker } from '@/components/domain/live-ticker'
import { MatchCard } from '@/components/domain/match-card'
import { ValueRadar } from '@/components/domain/value-radar'
import { AgentFeed } from '@/components/domain/agent-feed'
import { useMatches } from '@/hooks/use-matches'
import { useSession } from '@/hooks/use-session'
import { MatchCardSkeleton } from '@/components/ui/skeleton'

function formatBrtTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateStr))
  } catch {
    return '--:--'
  }
}

export default function HojePage() {
  const { data: matches, isLoading, error } = useMatches()
  const { session } = useSession()

  const liveMatches = matches?.filter((m: any) => m.status === 'live') ?? []
  const scheduledMatches = matches?.filter((m: any) => m.status !== 'live') ?? []
  const liveCount = liveMatches.length
  const totalCount = matches?.length ?? 0

  return (
    <>
      <AppHeader title="Jogos de hoje" userName={session?.user?.name} />
      <div className="flex flex-col gap-6 px-8 animate-screenIn">
        <LiveTicker />

        <section className="flex flex-col gap-3.5">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xs font-bold tracking-widest text-text-muted uppercase">Jogos de hoje</h2>
            <span className="font-mono text-xs text-text-muted">
              {totalCount} partida{totalCount !== 1 ? 's' : ''} {liveCount > 0 ? `· ${liveCount} ao vivo` : ''}
            </span>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </div>
          )}

          {error && (
            <div className="bg-bg-card border border-accent-red/20 rounded-card p-6 text-center">
              <p className="text-sm text-accent-red">Erro ao carregar jogos.</p>
            </div>
          )}

          {!isLoading && !error && totalCount === 0 && (
            <div className="bg-bg-card border border-border rounded-card p-8 text-center">
              <p className="text-sm text-text-secondary">Nenhum jogo agendado para hoje.</p>
            </div>
          )}

          {liveMatches.map((m: any) => (
            <MatchCard
              key={m.id}
              id={m.id}
              homeTeam={m.homeTeam ?? { shortName: '???', name: '?' }}
              awayTeam={m.awayTeam ?? { shortName: '???', name: '?' }}
              status={m.status}
              minute={m.minute}
              homeScore={m.homeScore}
              awayScore={m.awayScore}
              group={m.group}
              phase={m.phase}
              venue={m.venue ? `${m.venue}, ${m.city || ''}` : undefined}
              time={formatBrtTime(m.iniciaEm)}
              probability={0.72}
              probLabel={`${m.homeTeam?.shortName ?? '?'} VENCE`}
            />
          ))}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {scheduledMatches.map((m: any) => (
              <MatchCard
                key={m.id}
                id={m.id}
                homeTeam={m.homeTeam ?? { shortName: '???', name: '?' }}
                awayTeam={m.awayTeam ?? { shortName: '???', name: '?' }}
                status={m.status}
                group={m.group}
                time={formatBrtTime(m.iniciaEm)}
                probability={0.55}
                probLabel={m.homeTeam?.shortName ?? '?'}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ValueRadar />
          <AgentFeed />
        </div>
      </div>
    </>
  )
}
