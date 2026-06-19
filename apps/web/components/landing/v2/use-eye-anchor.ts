'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  registerEyeSlot,
  unregisterEyeSlot,
  subscribeStageEnabled,
  isStageEnabled,
  type EyeSlot,
  type EyeSlotConfig,
} from './eye-stage'

/** True only when the 3D orb stage is actually running; sections gate their static fallback on this. */
export function useStageEnabled(): boolean {
  return useSyncExternalStore(subscribeStageEnabled, isStageEnabled, () => false)
}

/** Register a section's DOM element as the eye/orb's home for that section (static config). */
export function useEyeAnchor<T extends HTMLElement = HTMLDivElement>(cfg: EyeSlotConfig) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!ref.current) return
    const slot = registerEyeSlot(ref.current, cfg)
    return () => unregisterEyeSlot(slot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.morph, cfg.intensity, cfg.radiusFactor, cfg.scan, cfg.interactive])
  return ref
}

/**
 * Like useEyeAnchor, but exposes the live slot so a section can drive its morph from a
 * ScrollTrigger scrub (e.g. the Radar: morph 0->1 across the pin, reversible on scroll-up).
 */
export function useEyeScrubAnchor<T extends HTMLElement = HTMLDivElement>(cfg: EyeSlotConfig) {
  const ref = useRef<T>(null)
  const slotRef = useRef<EyeSlot | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const slot = registerEyeSlot(ref.current, cfg)
    slotRef.current = slot
    return () => {
      unregisterEyeSlot(slot)
      slotRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { ref, slotRef }
}
