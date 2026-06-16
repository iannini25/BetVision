'use client'

import { useParams } from 'next/navigation'
import { AppHeader } from '@/components/layout/app-header'
import { Tabs, type TabItem } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { GlassCard } from '@/components/ui/glass-card'
import { useMatch } from '@/hooks/use-matches'
import { useSession } from '@/hooks/use-session'
import { matchPhase } from '@/lib/match'
import { MatchCenterHeader } from '@/components/domain/match-center/header'
import {
  ProbabilitiesPanel, LivePanel, OddsPanel, LineupsPanel, RefereePanel, NewsPanel, AnalysisPanel,
} from '@/components/domain/match-center/panels'

export default function MatchCenterPage() {
  const params = useParams<{ id: string }>()
  const matchId = Number(params.id)
  const { data: match, isLoading, error } = useMatch(matchId)
  const { session } = useSession()

  if (isLoading) {
    return (
      <>
        <AppHeader title="Match Center" userName={session?.user?.name} />
        <div className="px-8 flex flex-col gap-5">
          <GlassCard>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-12 w-40 mx-auto" />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </GlassCard>
        </div>
      </>
    )
  }

  if (error || !match) {
    return (
      <>
        <AppHeader title="Match Center" userName={session?.user?.name} />
        <div className="px-8">
          <GlassCard>
            <p className="text-sm text-text-secondary text-center py-6">Jogo não encontrado.</p>
          </GlassCard>
        </div>
      </>
    )
  }

  const phase = matchPhase(match.status)
  const home = match.homeTeam?.shortName ?? '???'
  const away = match.awayTeam?.shortName ?? '???'

  const items: TabItem[] = [
    { id: 'prob', label: 'Probabilidades', content: <ProbabilitiesPanel matchId={matchId} live={phase === 'live'} /> },
    ...(phase !== 'pre'
      ? [{ id: 'live', label: phase === 'live' ? 'Ao vivo' : 'Estatísticas', content: <LivePanel match={match} /> }]
      : []),
    { id: 'odds', label: 'Odds', content: <OddsPanel matchId={matchId} /> },
    { id: 'lineups', label: 'Escalações', content: <LineupsPanel matchId={matchId} homeTeam={match.homeTeam} awayTeam={match.awayTeam} /> },
    { id: 'referee', label: 'Árbitro', content: <RefereePanel referee={match.referee} /> },
    { id: 'news', label: 'Notícias', content: <NewsPanel matchId={matchId} /> },
    { id: 'analysis', label: 'Análise IA', content: <AnalysisPanel matchId={matchId} /> },
  ]

  return (
    <>
      <AppHeader title={`${home} × ${away}`} userName={session?.user?.name} />
      <div className="flex flex-col gap-5 px-8 animate-screenIn">
        <MatchCenterHeader match={match} />
        <Tabs items={items} ariaLabel="Seções do jogo" />
      </div>
    </>
  )
}
