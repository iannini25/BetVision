// The real BetV logo (the eye mark), processed from BetV-logo.png into a transparent,
// tight-cropped asset by scripts/process-logo.mjs. Used everywhere the wordmark appears.
// Plain <img> (no next/image optimizer dependency); width derived from the asset's aspect
// so there's no layout shift.

const ASPECT = 1.892 // intrinsic w/h of /brand/betv-logo.png (trimmed to the eye)

export function BetvLogo({
  height = 24,
  priority = false,
  className = '',
  alt = 'BetV',
}: {
  height?: number
  priority?: boolean
  className?: string
  alt?: string
}) {
  return (
    <img
      src="/brand/betv-logo.png"
      width={Math.round(height * ASPECT)}
      height={height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={className}
    />
  )
}
