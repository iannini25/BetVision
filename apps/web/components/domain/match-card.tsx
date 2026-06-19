'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { animate } from 'animejs'
import { LiveDot } from '@/components/ui/live-dot'
import { EyeRing } from '@/components/ui/eye-ring'
import { flashChange, prefersReducedMotion } from '@/lib/motion'

type MatchCardProps = {
  id: number
  homeTeam: { shortName: string; name: string }
  awayTeam: { shortName: string; name: string }
  status: string
  minute?: number | null
  homeScore?: number | null
  awayScore?: number | null
  group?: string | null
  phase?: string | null
  venue?: string | null
  time: string
  probability?: number
  probLabel?: string
  chips?: { label: string; value?: string; isValue?: boolean }[]
}

/** Previous value across renders, for detecting a goal (score change) on live data. */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

/**
 * A single live score digit. When its value changes (a goal), the new digit
 * drops in (translateY + fade) instead of hard-swapping. Uses anime.js v4 with a
 * transform-based reveal (compositor-friendly) and snaps under reduced motion.
 */
function ScoreDigit({ value, side }: { value: number; side: 'home' | 'away' }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = usePrevious(value)

  useEffect(() => {
    const el = ref.current
    if (!el || prev === undefined || prev === value) return
    if (prefersReducedMotion()) return

    const anim = animate(el, {
      opacity: [0.4, 1],
      translateY: ['-0.4em', '0em'],
      duration: 420,
      ease: 'out(3)',
    })
    return () => {
      anim.revert()
    }
  }, [value, prev, side])

  return (
    <span ref={ref} className="inline-block">
      {value}
    </span>
  )
}

export function MatchCard(props: MatchCardProps) {
  const isLive = props.status === 'live'
  const scoreboardRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLSpanElement>(null)

  const homeScore = props.homeScore ?? 0
  const awayScore = props.awayScore ?? 0
  const totalGoals = homeScore + awayScore
  const prevTotal = usePrevious(totalGoals)
  const prevMinute = usePrevious(props.minute ?? null)

  // Goal scored -> tint the whole scoreboard green (in addition to the per-digit drop).
  useEffect(() => {
    if (!isLive || !scoreboardRef.current) return
    if (prevTotal === undefined || prevTotal === totalGoals) return
    flashChange(scoreboardRef.current, {
      color: 'rgba(34,197,94,0.30)',
      property: 'backgroundColor',
      duration: 760,
    })
  }, [isLive, totalGoals, prevTotal])

  // Event-driven minute tick: one subtle pulse each time the clock advances,
  // replacing the always-on decorative blink (which never meant anything).
  useEffect(() => {
    const el = minuteRef.current
    if (!isLive || !el) return
    if (prevMinute === undefined || prevMinute === (props.minute ?? null)) return
    if (prefersReducedMotion()) return
    const anim = animate(el, {
      opacity: [0.45, 1],
      scale: [0.92, 1],
      duration: 360,
      ease: 'out(3)',
    })
    return () => {
      anim.revert()
    }
  }, [isLive, props.minute, prevMinute])

  return (
    <Link href={`/jogo/${props.id}`}>
      <article
        className={`
          relative bg-bg-card border border-border rounded-card p-5 flex flex-col gap-4
          animate-fadeUp transition-transform duration-200 cursor-pointer
          hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] hover:border-border-hover
          active:translate-y-0 active:scale-[0.98]
          ${isLive ? 'border-l-[3px] border-l-accent-green' : ''}
        `}
      >
        {/* Top row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold tracking-widest text-text-muted uppercase">
            {props.group ? `Grupo ${props.group}` : ''} {props.phase ? `· ${props.phase}` : ''} {props.venue ? `· ${props.venue}` : ''}
          </span>
          {isLive ? (
            <span className="ml-auto flex items-center gap-2 bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.35)] rounded-pill px-3 py-1">
              <LiveDot />
              <span className="text-xs font-bold tracking-wider text-accent-green-text">AO VIVO</span>
              <span
                ref={minuteRef}
                className="font-mono text-xs font-semibold text-accent-green-text tabular-nums"
              >
                {props.minute}&apos;
              </span>
            </span>
          ) : (
            <span className="ml-auto flex items-baseline gap-1.5">
              <span className="font-display font-bold text-xl tabular-nums">{props.time}</span>
              <span className="text-[11px] font-semibold text-text-muted">BRT</span>
            </span>
          )}
        </div>

        {/* Teams + Ring */}
        <div className="flex items-center gap-7 flex-wrap">
          <div className="flex-1 min-w-0 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="font-display font-bold text-[15px] tracking-wide">{props.homeTeam.shortName}</span>
            </div>
            {isLive ? (
              <div
                ref={scoreboardRef}
                className="flex flex-col items-center gap-1 rounded-input px-2 py-0.5"
              >
                <span className="font-mono font-extrabold text-[46px] tabular-nums leading-none">
                  <ScoreDigit value={homeScore} side="home" />
                  <span className="text-text-muted font-semibold px-2.5">×</span>
                  <ScoreDigit value={awayScore} side="away" />
                </span>
              </div>
            ) : (
              <span className="text-text-muted text-lg font-semibold">vs</span>
            )}
            <div className="flex flex-col items-center gap-2">
              <span className="font-display font-bold text-[15px] tracking-wide text-text-secondary">
                {props.awayTeam.shortName}
              </span>
            </div>
          </div>
          {props.probability !== undefined && (
            <EyeRing
              probability={props.probability}
              label={`${Math.round(props.probability * 100)}%`}
              sublabel={props.probLabel || props.homeTeam.shortName}
              size={isLive ? 128 : 64}
            />
          )}
        </div>

        {/* Chips */}
        {props.chips && props.chips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {props.chips.map((chip, i) => (
              <span
                key={i}
                className={`
                  flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12.5px] font-medium
                  ${chip.isValue
                    ? 'bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.30)] text-accent-green-text font-semibold'
                    : 'bg-[rgba(139,92,246,0.08)] border border-border-input text-text-secondary'
                  }
                `}
              >
                {chip.label}
                {chip.value && (
                  <span className="font-mono font-semibold text-text-primary">{chip.value}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </article>
    </Link>
  )
}
