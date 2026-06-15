'use client'

import { useEyeAnchor, useStageEnabled } from './use-eye-anchor'
import { BetvLogo } from './betv-logo'
import styles from './landing.module.css'

/**
 * The hero eye. It anchors the shared LandingStage orb (which reconstructs the BetV logo in
 * living particles) and marks itself interactive so those particles repel from the cursor.
 * When the 3D stage can't run (reduced-motion / no WebGL / mobile / low-power), this renders
 * the real logo as a crisp static fallback — the eye is always present and on-brand.
 */
export function EyePortal({ className = '' }: { className?: string }) {
  // bigger radius so the particles form an aura that echoes (and extends past) the crisp core
  const wrapRef = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 1, radiusFactor: 0.34, interactive: true })
  const stageOn = useStageEnabled()

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="O olho do BetV, a inteligência que calcula a probabilidade de cada jogo"
      className={`relative aspect-[440/300] w-full ${className}`}
    >
      <div className={styles.eyeBloom} aria-hidden="true" />
      <div className={styles.eyeRings} aria-hidden="true" />
      <div className={`${styles.portalGlow} !blur-2xl`} aria-hidden="true" />
      {/* When the 3D stage runs, the animated particle eye (blink + gaze) IS the eye, so the
          crisp logo hides. It returns as the complete static fallback when 3D can't run. */}
      <div className={`absolute inset-0 grid place-items-center transition-opacity duration-700 ${stageOn ? 'opacity-0' : 'opacity-100'}`}>
        <BetvLogo height={120} priority alt="" className="drop-shadow-[0_0_34px_rgba(168,85,247,0.5)]" />
      </div>
    </div>
  )
}
