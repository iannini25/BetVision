'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shape-matched loading skeletons. Each mirrors the real component's silhouette
 * (name + metric + chips, table rows, KPI + bars) so the layout does not jump on
 * load. Motion is the shared <Skeleton/> shimmer (compositor-friendly translateX),
 * so these are inert under prefers-reduced-motion via that primitive.
 */

/** Team card: name row, ELO block, and 5 form chips. */
export function TeamCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-card p-5 flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="ml-auto h-3 w-14" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-2.5 w-7" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <Skeleton className="h-2.5 w-10" />
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5 w-5 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Referee card: name + meta, rigidity number, and two stat rows. */
export function RefereeCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="ml-auto h-5 w-16 rounded-md" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-2.5 w-10" />
        </div>
        <div className="flex-1 flex flex-col gap-2.5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Players table: header strip + repeated data rows matching the 6-column grid. */
export function PlayersTableSkeleton({ rows = 8 }: { rows?: number }) {
  const COLS = 'grid-cols-[minmax(180px,1.4fr)_70px_repeat(4,minmax(80px,1fr))]'
  return (
    <div className="bg-bg-card border border-border rounded-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={`grid ${COLS} gap-2 items-center px-5 py-3.5 border-b border-border`}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className={`h-2.5 ${i === 0 ? 'w-20' : 'w-10 justify-self-end'}`} />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className={`grid ${COLS} gap-2 items-center px-5 py-3 border-b border-border-subtle`}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-9" />
              {[0, 1, 2, 3].map((c) => (
                <Skeleton key={c} className="h-3.5 w-12 justify-self-end" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-border">
        <Skeleton className="h-2.5 w-56" />
      </div>
    </div>
  )
}

/** Modelo KPI card: label, big number, and caption. */
export function KpiCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-card p-5 flex flex-col gap-2">
      <Skeleton className="h-2.5 w-28" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-2.5 w-24" />
    </div>
  )
}

/** A single ProbBar silhouette: label row + filled track. */
export function ProbBarSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  )
}
