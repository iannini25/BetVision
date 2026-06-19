'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'iconsax-reactjs'
import { MARKET_LABELS, TICKER_EVENT_COLORS, TICKER_EVENT_FALLBACK_COLOR, RIGIDITY_LABELS } from '@betv/shared'
import { GlassCard } from '@/components/ui/glass-card'
import { EyeRing } from '@/components/ui/eye-ring'
import { ProbBar } from '@/components/ui/prob-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import {
  useMatchProbabilities, useMatchOdds, useMatchLineups, useMatchNews, useMatchAnalysis,
} from '@/hooks/use-matches'
import {
  latestProbabilities, findProb, groupOddsByMarket, eventShortLabel, eventDescription,
  type ProbRow, type MatchEventLike,
} from '@/lib/match'

const SECONDARY_MARKETS = ['over_under_2_5', 'btts', 'corners_over_9_5', 'cards_over_4_5', 'var_penalty']
const STAT_LABELS: Record<string, string> = {
  possession: 'Posse de bola', shots: 'Chutes', shotsOnTarget: 'No alvo', corners: 'Escanteios', fouls: 'Faltas',
}

// ---------- shared state helpers ----------

function PanelCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassCard>
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase">{title}</h3>
        {children}
      </div>
    </GlassCard>
  )
}

function PanelLoading() {
  return (
    <GlassCard>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </GlassCard>
  )
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <GlassCard>
      <p className="text-sm text-text-secondary text-center py-4">{children}</p>
    </GlassCard>
  )
}

// ---------- Probabilities ----------

export function ProbabilitiesPanel({ matchId, live }: { matchId: number; live: boolean }) {
  const { data, isLoading, error } = useMatchProbabilities(matchId)
  if (isLoading) return <PanelLoading />
  if (error) return <PanelMessage>Erro ao carregar probabilidades.</PanelMessage>

  const rows = latestProbabilities((data ?? []) as ProbRow[])
  const winners = rows.filter((r) => r.market === 'winner').sort((a, b) => b.probability - a.probability)
  if (winners.length === 0 && rows.length === 0) {
    return <PanelMessage>Sem probabilidades calculadas para este jogo ainda.</PanelMessage>
  }
  const favorite = winners[0]

  return (
    <PanelCard title={live ? 'Probabilidades ao vivo' : 'Probabilidades'}>
      {favorite && (
        <div className="flex justify-center">
          <EyeRing
            probability={favorite.probability}
            label={`${Math.round(favorite.probability * 100)}%`}
            sublabel={favorite.outcome.toUpperCase()}
            size={140}
            live={live}
          />
        </div>
      )}
      <div className="flex flex-col gap-3">
        {winners.map((w) => (
          <ProbBar key={w.outcome} label={w.outcome} value={w.probability} live={live} />
        ))}
      </div>
      <div className="border-t border-border-subtle pt-3 flex flex-col gap-3">
        {SECONDARY_MARKETS.map((market) => {
          const row = findProb(rows, market)
          if (!row) return null
          return <ProbBar key={market} label={MARKET_LABELS[market] ?? market} value={row.probability} live={live} />
        })}
      </div>
      <Disclaimer18 />
    </PanelCard>
  )
}

// ---------- Live stats + events ----------

type LivePanelData = {
  stats?: Record<string, { home: number; away: number }> | null
  events?: MatchEventLike[] | null
}

export function LivePanel({ match }: { match: LivePanelData }) {
  const stats = match.stats ?? {}
  const events = [...(match.events ?? [])].sort((a, b) => b.minute - a.minute)
  const statKeys = Object.keys(STAT_LABELS).filter((k) => stats[k])

  if (statKeys.length === 0 && events.length === 0) {
    return <PanelMessage>Sem dados ao vivo ainda — eles aparecem quando o jogo começa.</PanelMessage>
  }

  return (
    <div className="flex flex-col gap-5">
      {statKeys.length > 0 && (
        <PanelCard title="Estatísticas">
          <div className="flex flex-col gap-3">
            {statKeys.map((key) => {
              const s = stats[key]
              const total = s.home + s.away
              const homePct = total ? (s.home / total) * 100 : 50
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-text-primary w-8 text-right">{s.home}</span>
                  <div className="flex-1 flex gap-1">
                    <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden flex justify-end">
                      <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-500" style={{ width: `${homePct}%` }} />
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden">
                      <div className="h-full rounded-full bg-text-muted/30 transition-[width] duration-500" style={{ width: `${100 - homePct}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-text-secondary w-8">{s.away}</span>
                  <span className="text-[11px] text-text-muted w-20">{STAT_LABELS[key]}</span>
                </div>
              )
            })}
          </div>
        </PanelCard>
      )}

      {events.length > 0 && (
        <PanelCard title="Eventos">
          <div className="flex flex-col gap-3">
            {events.map((e, i) => (
              <div key={`${e.minute}-${i}`} className="flex items-center gap-3">
                <span className="font-mono text-xs text-text-muted w-8 text-right">{e.minute}&apos;</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: TICKER_EVENT_COLORS[e.type] ?? TICKER_EVENT_FALLBACK_COLOR }} />
                <span className="text-[13px] text-text-primary">{eventShortLabel(e.type)} · {eventDescription(e)}</span>
              </div>
            ))}
          </div>
        </PanelCard>
      )}
    </div>
  )
}

// ---------- Odds ----------

export function OddsPanel({ matchId }: { matchId: number }) {
  const { data, isLoading, error } = useMatchOdds(matchId)
  if (isLoading) return <PanelLoading />
  if (error) return <PanelMessage>Erro ao carregar odds.</PanelMessage>

  const markets = groupOddsByMarket((data ?? []) as any[])
  if (markets.length === 0) return <PanelMessage>Sem odds disponíveis para este jogo ainda.</PanelMessage>

  return (
    <div className="flex flex-col gap-5">
      {markets.map((m) => (
        <PanelCard key={m.market} title={MARKET_LABELS[m.market] ?? m.market}>
          <div className="flex flex-col gap-4">
            {m.outcomes.map((o) => (
              <div key={o.outcome} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-text-primary">{o.outcome}</span>
                  <span className="text-[11px] text-text-muted">
                    melhor: <span className="font-mono font-bold text-accent-green-text">{o.best.odds.toFixed(2)}</span> · {o.best.bookmaker}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {o.quotes.map((q) => {
                    const isBest = q.bookmaker === o.best.bookmaker && q.odds === o.best.odds
                    return (
                      <span
                        key={q.bookmaker}
                        className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] border ${
                          isBest
                            ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.30)] text-accent-green-text font-semibold'
                            : 'bg-bg-subtle border-border text-text-secondary'
                        }`}
                      >
                        {q.bookmaker}
                        <span className="font-mono font-semibold text-text-primary">{q.odds.toFixed(2)}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      ))}
      <Disclaimer18 />
    </div>
  )
}

// ---------- Lineups ----------

type Lineup = { teamId: number; formation?: string | null; confirmed?: boolean | null; players?: { name: string; number?: number; position?: string }[] | null }
type TeamRef = { id: number; shortName: string } | null | undefined

export function LineupsPanel({ matchId, homeTeam, awayTeam }: { matchId: number; homeTeam: TeamRef; awayTeam: TeamRef }) {
  const { data, isLoading, error } = useMatchLineups(matchId)
  if (isLoading) return <PanelLoading />
  if (error) return <PanelMessage>Erro ao carregar escalações.</PanelMessage>

  const lineups = (data ?? []) as Lineup[]
  if (lineups.length === 0) return <PanelMessage>Escalações ainda não confirmadas.</PanelMessage>

  const teamName = (id: number) =>
    id === homeTeam?.id ? homeTeam?.shortName : id === awayTeam?.id ? awayTeam?.shortName : 'Time'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {lineups.map((lu) => (
        <PanelCard key={lu.teamId} title={`${teamName(lu.teamId)} · ${lu.formation ?? '—'}`}>
          <div className="flex items-center gap-2 -mt-2 mb-1">
            <span className={`text-[10.5px] font-semibold tracking-wide rounded-pill px-2 py-0.5 ${
              lu.confirmed ? 'bg-[rgba(34,197,94,0.10)] text-accent-green-text' : 'bg-bg-subtle text-text-muted'
            }`}>
              {lu.confirmed ? 'CONFIRMADA' : 'PROVÁVEL'}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {(lu.players ?? []).map((p) => (
              <li key={`${p.number}-${p.name}`} className="flex items-center gap-3 text-[13px]">
                <span className="font-mono text-text-muted w-6 text-right">{p.number ?? '–'}</span>
                <span className="text-text-primary flex-1">{p.name}</span>
                <span className="text-[11px] text-text-muted">{p.position}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      ))}
    </div>
  )
}

// ---------- Referee ----------

type RefereeData = {
  id: number; name: string; country?: string | null
  avgYellows?: number | null; avgReds?: number | null; penaltyRate?: number | null; rigidity?: number | null
} | null | undefined

function rigidityKey(rigidity: number): keyof typeof RIGIDITY_LABELS {
  if (rigidity < 40) return 'lenient'
  if (rigidity < 70) return 'moderate'
  return 'strict'
}

export function RefereePanel({ referee }: { referee: RefereeData }) {
  if (!referee) return <PanelMessage>Árbitro ainda não escalado para este jogo.</PanelMessage>

  const rigidity = referee.rigidity ?? 50
  const tag = RIGIDITY_LABELS[rigidityKey(rigidity)]
  const metrics = [
    { label: 'Amarelos/jogo', value: (referee.avgYellows ?? 0).toFixed(1) },
    { label: 'Vermelhos/jogo', value: (referee.avgReds ?? 0).toFixed(2) },
    { label: 'Taxa de pênalti', value: (referee.penaltyRate ?? 0).toFixed(2) },
  ]

  return (
    <PanelCard title="Árbitro escalado">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-text-primary">{referee.name}</span>
          {referee.country && <span className="text-xs text-text-muted">{referee.country}</span>}
        </div>
        <span className="rounded-pill px-3 py-1 text-xs font-bold tracking-wider" style={{ color: tag.color, background: `${tag.color}1A` }}>
          {tag.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-bg-subtle rounded-input p-3 text-center">
            <div className="font-mono font-bold text-lg text-text-primary">{m.value}</div>
            <div className="text-[10.5px] text-text-muted mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
      <Link href={`/arbitro/${referee.id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-green-text hover:underline">
        Ver perfil completo do árbitro
        <ArrowRight size={16} color="currentColor" variant="Linear" aria-hidden="true" />
      </Link>
      <Disclaimer18 />
    </PanelCard>
  )
}

// ---------- News ----------

export function NewsPanel({ matchId }: { matchId: number }) {
  const { data, isLoading, error } = useMatchNews(matchId)
  if (isLoading) return <PanelLoading />
  if (error) return <PanelMessage>Erro ao carregar notícias.</PanelMessage>

  const news = (data ?? []) as any[]
  if (news.length === 0) return <PanelMessage>Sem notícias para este jogo ainda.</PanelMessage>

  return (
    <div className="flex flex-col gap-3">
      {news.map((n) => (
        <GlassCard key={n.id}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {n.category && (
                <span className="text-[10.5px] font-bold tracking-wider text-brand-violet uppercase">{n.category}</span>
              )}
              {n.source && <span className="text-[11px] text-text-muted">· {n.source}</span>}
            </div>
            <span className="text-[14px] font-semibold text-text-primary">{n.title}</span>
            {n.summary && <span className="text-[13px] text-text-secondary">{n.summary}</span>}
            {n.impact && <span className="text-[12px] text-accent-green-text">{n.impact}</span>}
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

// ---------- AI analysis ----------

export function AnalysisPanel({ matchId }: { matchId: number }) {
  const { data, isLoading, error } = useMatchAnalysis(matchId)
  if (isLoading) return <PanelLoading />
  if (error) return <PanelMessage>Erro ao carregar a análise.</PanelMessage>

  const analyses = (data ?? []) as any[]
  if (analyses.length === 0) return <PanelMessage>Análise da IA ainda não gerada para este jogo.</PanelMessage>

  return (
    <div className="flex flex-col gap-3">
      {analyses.map((a) => (
        <PanelCard key={a.id} title={a.type === 'pre_match' ? 'Análise pré-jogo' : 'Análise da IA'}>
          <p className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-line">{a.content}</p>
          <Disclaimer18 />
        </PanelCard>
      ))}
    </div>
  )
}
