'use client'

import { useEffect, useMemo, useRef } from 'react'
import { NEWS_CATEGORY_COLORS, NEWS_CATEGORY_FALLBACK_COLOR } from '@betv/shared'
import { LiveDot } from '@/components/ui/live-dot'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgentFeed } from '@/hooks/use-matches'
import { relativeTimeAgo } from '@/lib/match'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

type FeedItem = {
  category: string
  categoryColor: string
  ago: string
  text: string
  source: string
  impact: string
}

function toFeedItem(news: any): FeedItem {
  const category = (news.category ?? 'NOTÍCIA').toUpperCase()
  return {
    category,
    categoryColor: NEWS_CATEGORY_COLORS[category] ?? NEWS_CATEGORY_FALLBACK_COLOR,
    ago: relativeTimeAgo(news.publishedAt ?? news.criadoEm),
    text: news.summary || news.title,
    source: news.source ?? '—',
    impact: news.impact ?? '',
  }
}

export function AgentFeed() {
  const { data, isLoading } = useAgentFeed()
  const items = useMemo<FeedItem[]>(() => (data ?? []).map(toFeedItem), [data])
  const listRef = useRef<HTMLDivElement>(null)

  // Build the feed in sequence on mount: each item slides up + fades in, ~80ms
  // apart, so the panel reads as a live agent reporting one item at a time.
  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-feed-row]'))
    if (!rows.length) return

    const anim = staggerReveal(rows, { y: 14, duration: 620, delayStep: 80, ease: 'out(3)' })
    return () => {
      anim?.revert()
    }
  }, [items])

  // Avoid a flash of fully-painted rows before the stagger runs (transforms set
  // in CSS are invisible to anime.js from-value reads, so we hide via inline style
  // and let staggerReveal tween opacity/y back in). Reduced motion keeps them visible.
  const initialHidden = !prefersReducedMotion()

  return (
    <section className="bg-bg-secondary border border-border rounded-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <LiveDot />
        <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase">Últimas do agente</h2>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-5/6" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-[13px] text-text-muted py-2">O agente ainda não classificou notícias.</p>
      )}

      <div ref={listRef} className="flex flex-col gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            data-feed-row
            style={initialHidden ? { opacity: 0, borderColor: 'rgba(168,85,247,0.55)' } : { borderColor: 'rgba(168,85,247,0.55)' }}
            className="border-l-2 pl-3.5 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold tracking-wider rounded-md px-1.5 py-0.5"
                style={{
                  color: item.categoryColor,
                  background: `${item.categoryColor}18`,
                  border: `1px solid ${item.categoryColor}4D`,
                }}
              >
                {item.category}
              </span>
              <span className="text-[11px] text-text-muted">{item.ago}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-text-primary">{item.text}</p>
            <span className="text-[11px] text-text-muted">{item.source}{item.impact ? ` · impacto: ${item.impact}` : ''}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
