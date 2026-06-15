'use client'

export function LiveDot({ size = 7 }: { size?: number }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full bg-accent-green"
        style={{ boxShadow: 'var(--shadow-glow-green)' }}
      />
      <span className="absolute inset-0 rounded-full bg-accent-green animate-pulseRing" />
    </span>
  )
}
