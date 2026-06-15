'use client'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-bg-subtle ${className}`}>
      {/* Compositor-friendly translateX sweep (no backgroundPosition repaint), brand-tinted. */}
      <div
        aria-hidden
        className="absolute inset-0 -translate-x-full animate-shimmerSweep"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.10) 50%, transparent 100%)',
        }}
      />
    </div>
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-card p-5 flex flex-col gap-4">
      <Skeleton className="h-3 w-48" />
      <div className="flex items-center gap-6">
        <div className="flex-1 flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-28 rounded-pill" />
        <Skeleton className="h-7 w-28 rounded-pill" />
      </div>
    </div>
  )
}
