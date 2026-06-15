// Shared registry that lets the single persistent R3F stage know where the eye/orb
// should sit and how it should look in each section. Sections register a DOM anchor +
// the desired orb state; the stage reads the live rects each frame and travels/morphs
// toward the section nearest the viewport center. No per-section canvas remounts.

export type EyeSlotConfig = {
  morph: number // 0 = logo-eye formation · 1 = value scatter
  intensity: number // 0..1 glow/opacity
  radiusFactor?: number // orb radius = anchorRect.width * factor (default 0.46)
  scan?: boolean // adds a slow horizontal "scanning" drift (the eye sweeping)
  interactive?: boolean // particles repel from the cursor (hero protagonist only)
  desat?: number // 0..1 desaturate the eye into a quiet background detail (subtle sections)
}

export type EyeSlot = EyeSlotConfig & { el: HTMLElement; id: number }

export const DEFAULT_RADIUS_FACTOR = 0.46

const slots: EyeSlot[] = []
let nextId = 1

// Returns the slot object so callers can mutate it live (e.g. scrub morph 0..1 on the Radar).
export function registerEyeSlot(el: HTMLElement, cfg: EyeSlotConfig): EyeSlot {
  const slot: EyeSlot = { el, id: nextId++, radiusFactor: DEFAULT_RADIUS_FACTOR, ...cfg }
  slots.push(slot)
  return slot
}

export function unregisterEyeSlot(slot: EyeSlot): void {
  const i = slots.indexOf(slot)
  if (i >= 0) slots.splice(i, 1)
}

export function getEyeSlots(): readonly EyeSlot[] {
  return slots
}

// Whether the 3D stage is actually running (false on no-WebGL / reduced-motion / mobile).
// Sections read this to decide whether to render their own static fallback visual.
let stageEnabled = false
const enabledListeners = new Set<() => void>()

export function setStageEnabled(v: boolean): void {
  if (v === stageEnabled) return
  stageEnabled = v
  enabledListeners.forEach((f) => f())
}
export function subscribeStageEnabled(cb: () => void): () => void {
  enabledListeners.add(cb)
  return () => enabledListeners.delete(cb)
}
export function isStageEnabled(): boolean {
  return stageEnabled
}

// Live signals the reactive background reads so the dust field is genuinely reactive:
// scroll velocity (sourced from Lenis, the single scroll authority) and the orb's current
// on-screen position (so particles stream toward wherever the eye actually is, not a fixed spot).
let lenisScrollV = 0
export function setLenisScrollV(v: number): void {
  lenisScrollV = v
}
export function getLenisScrollV(): number {
  return lenisScrollV
}

let orbScreenX: number | null = null
let orbScreenY: number | null = null
export function setOrbScreen(x: number, y: number): void {
  orbScreenX = x
  orbScreenY = y
}
export function getOrbScreen(): { x: number; y: number } | null {
  return orbScreenX === null || orbScreenY === null ? null : { x: orbScreenX, y: orbScreenY }
}
