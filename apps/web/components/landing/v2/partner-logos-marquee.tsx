'use client'

import { useReducedMotion } from '@/hooks/use-reduced-motion'
import type { PartnerLogo } from '@/lib/partner-logos'

// Small, neutral, easily-editable label. Keep it NEUTRAL — grayscale + uniform treatment so the
// strip endorses no specific brand or betting house (informational / example only, compliance).
const LABEL = 'Funciona com'

// Soft fade at both edges so logos dissolve in/out instead of hard-clipping.
const EDGE_FADE = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%)',
  maskImage: 'linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%)',
} as const

function Logo({ logo }: { logo: PartnerLogo }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny decorative grayscale logos of unknown intrinsic size; next/image buys nothing here
    <img
      src={logo.src}
      alt={logo.name}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-10 w-auto shrink-0 opacity-50 grayscale transition duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0 sm:h-12 lg:h-14"
    />
  )
}

/**
 * Hero → demo seam: a short, looping strip of partner logos, grayscale and neutral, with a soft
 * edge fade. Auto-populated from `public/partner-logos/` (see lib/partner-logos.ts). Never pauses;
 * un-greys on hover so they're readable; collapses to a calm static row under reduced-motion. The section is
 * transparent — it sits over the page's global background, adding no seam.
 */
export function PartnerLogosMarquee({ logos }: { logos: PartnerLogo[] }) {
  const reduced = useReducedMotion()
  if (!logos.length) return null

  return (
    <section aria-label={LABEL} className="relative z-10 px-5 pb-12 pt-4 sm:px-8 sm:pb-16">
      <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-text-low">
        {LABEL}
      </p>

      {reduced ? (
        <div className="mx-auto flex max-w-[920px] flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((l) => (
            <Logo key={l.src} logo={l} />
          ))}
        </div>
      ) : (
        <div className="relative mx-auto max-w-[1100px] overflow-hidden" style={EDGE_FADE}>
          {/* Seamless infinite loop: two identical tiles, each carrying its OWN trailing gap
              (pr-14 == the inner gap-14). The track has NO outer gap, so translateX(-50%) advances
              exactly one tile width and tile #2 lands precisely where tile #1 began — no jump, no seam. */}
          <div className="flex w-max animate-ticker items-center">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={copy === 1 || undefined}>
                {logos.map((l) => (
                  <Logo key={`${copy}-${l.src}`} logo={l} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
