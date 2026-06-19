'use client'

import { LiveDot } from '@/components/ui/live-dot'
import { GlassCard } from '@/components/ui/glass-card'
import { matchPhase, formatBrtTime } from '@/lib/match'

type MatchHeaderData = {
  homeTeam?: { shortName: string } | null
  awayTeam?: { shortName: string } | null
  homeScore?: number | null
  awayScore?: number | null
  minute?: number | null
  status: string
  period?: string | null
  group?: string | null
  phase?: string | null
  venue?: string | null
  city?: string | null
  iniciaEm: string
}

const PERIOD_LABELS: Record<string, string> = {
  '1st_half': '1º TEMPO',
  '2nd_half': '2º TEMPO',
  halftime: 'INTERVALO',
}

export function MatchCenterHeader({ match }: { match: MatchHeaderData }) {
  const phase = matchPhase(match.status)
  const home = match.homeTeam?.shortName ?? '???'
  const away = match.awayTeam?.shortName ?? '???'
  const place = [match.venue, match.city].filter(Boolean).join(', ')
  const borderClass = phase === 'live' ? 'border-l-accent-green' : 'border-l-border-hover'

  return (
    <GlassCard className={`border-l-[3px] ${borderClass}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold tracking-widest text-text-muted uppercase">
            {[match.group ? `Grupo ${match.group}` : null, match.phase, place].filter(Boolean).join(' · ')}
          </span>
          <span className="ml-auto">
            {phase === 'live' && (
              <span className="flex items-center gap-2 bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.35)] rounded-pill px-3 py-1">
                <LiveDot />
                <span className="text-xs font-bold tracking-wider text-accent-green-text">AO VIVO</span>
                <span className="font-mono text-xs font-semibold text-accent-green-text tabular-nums">{match.minute ?? 0}&apos;</span>
              </span>
            )}
            {phase === 'pre' && (
              <span className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-xl tabular-nums">{formatBrtTime(match.iniciaEm)}</span>
                <span className="text-[11px] font-semibold text-text-muted">BRT</span>
              </span>
            )}
            {phase === 'finished' && (
              <span className="rounded-pill border border-border px-3 py-1 text-xs font-bold tracking-wider text-text-muted">
                ENCERRADO
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-center gap-10">
          <span className="font-display font-bold text-xl">{home}</span>
          {phase === 'pre' ? (
            <span className="text-text-muted text-2xl font-semibold">vs</span>
          ) : (
            <span className="font-display font-extrabold text-5xl tabular-nums">
              {match.homeScore ?? 0}
              <span className="text-text-muted font-semibold px-3">×</span>
              {match.awayScore ?? 0}
            </span>
          )}
          <span className="font-display font-bold text-xl text-text-secondary">{away}</span>
        </div>

        <div className="text-center text-[11px] font-semibold text-text-muted tracking-widest">
          {phase === 'live' && (PERIOD_LABELS[match.period ?? ''] ?? 'AO VIVO')}
          {phase === 'pre' && 'PRÉ-JOGO'}
          {phase === 'finished' && 'FIM DE JOGO'}
        </div>
      </div>
    </GlassCard>
  )
}
