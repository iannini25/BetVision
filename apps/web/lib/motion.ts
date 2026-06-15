import { animate, stagger, utils, type AnimationParams, type TargetsParam } from 'animejs'

/**
 * Shared anime.js v4 motion helpers for the in-app product UI.
 *
 * Every helper is a no-op (or instant snap) under prefers-reduced-motion, so callers
 * can fire them unconditionally. The landing keeps its own GSAP system — these are for
 * the data-reactive motion (`apps/web/components/domain/*`, `(app)/*`).
 *
 * anime.js v4 reminders (see .claude/skills/animejs): targets-first `animate(t, {...})`,
 * default ease is 'out(2)' not linear, `loop: N` plays N+1 times, transform shorthands
 * x/y infer px, instances are thenable, `.revert()` for cleanup.
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type FlashOptions = {
  /** Tinted highlight color the element flashes from (default brand-soft glow). */
  color?: string
  property?: 'backgroundColor' | 'borderColor'
  duration?: number
}

/**
 * One-shot tinted flash that fades back to transparent — for "this value just
 * updated" feedback on live odds/scores/value flags. The element must have a
 * transparent resting background/border for the fade-out to read.
 */
export function flashChange(
  targets: TargetsParam,
  { color = 'rgba(168,85,247,0.28)', property = 'backgroundColor', duration = 700 }: FlashOptions = {},
) {
  if (prefersReducedMotion()) return
  return animate(targets, {
    [property]: [color, 'rgba(0,0,0,0)'],
    duration,
    ease: 'out(3)',
  } as AnimationParams)
}

/** Direction-aware color for a number that just moved (down = good for odds/price). */
export const directionColor = {
  up: 'rgba(74,222,128,0.28)',
  down: 'rgba(251,77,109,0.26)',
} as const

type RevealOptions = {
  y?: number
  duration?: number
  ease?: string
  delayStep?: number
  from?: 'first' | 'last' | 'center'
}

/**
 * Stagger a set of elements into view (translateY + fade). For feeds, value lists,
 * KPI rows — anything that "builds" on mount. Snaps to final state under reduced motion.
 */
export function staggerReveal(
  targets: TargetsParam,
  { y = 12, duration = 620, ease = 'out(3)', delayStep = 70, from = 'first' }: RevealOptions = {},
) {
  if (prefersReducedMotion()) {
    utils.set(targets, { opacity: 1, y: 0 })
    return
  }
  return animate(targets, {
    opacity: [0, 1],
    y: [y, 0],
    duration,
    delay: stagger(delayStep, { from }),
    ease,
  })
}

/**
 * Prepend-arrival animation for a single newly-added feed/list node: it slides down
 * from a collapsed state with a brief brand edge flash. Call right after inserting.
 */
export function arriveItem(target: Element, accent = 'rgba(168,85,247,0.5)') {
  if (prefersReducedMotion()) return
  return animate(target, {
    opacity: [0, 1],
    y: [-10, 0],
    duration: 560,
    ease: 'out(4)',
    onBegin: () => {
      const el = target as HTMLElement
      el.style.boxShadow = `inset 3px 0 0 ${accent}`
      animate(el, { boxShadow: [`inset 3px 0 0 ${accent}`, 'inset 0px 0 0 rgba(0,0,0,0)'], duration: 900, ease: 'out(2)' })
    },
  })
}
