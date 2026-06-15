'use client'

import { useEffect, useRef } from 'react'
import { animate, stagger, splitText, onScroll, utils } from 'animejs'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

type Options = {
  unit?: 'chars' | 'words'
  /** per-unit stagger step (ms). */
  step?: number
  /** onScroll enter threshold ('container target' order). */
  enter?: string
  /** initial delay before the stagger (ms). */
  delay?: number
}

/**
 * anime.js v4 text-split entrance: the element's text ASSEMBLES (per char/word, rising +
 * un-flipping) when it scrolls into view, instead of fading as a block. Runs alongside the
 * landing's GSAP system — attach this ref ONLY to an element with no `data-reveal`, so the two
 * never animate the same node. Reduced-motion snaps to final. Returns the ref to attach.
 */
export function useAnimeTextReveal<T extends HTMLElement = HTMLHeadingElement>(options: Options = {}) {
  const { unit = 'chars', step = 24, enter = 'bottom-=80 top', delay = 80 } = options
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // words:false is required — anime splits words by default even when only chars are asked.
    const splitter = splitText(el, { chars: unit === 'chars', words: unit === 'words', accessible: true })
    const targets = unit === 'words' ? splitter.words : splitter.chars

    if (reduced) {
      utils.set(targets, { opacity: 1, translateY: 0, rotateX: 0 })
      return () => {
        splitter.revert()
      }
    }

    utils.set(targets, { opacity: 0, translateY: '0.5em', rotateX: -55 })
    const anim = animate(targets, {
      opacity: [0, 1],
      translateY: ['0.5em', 0],
      rotateX: [-55, 0],
      duration: 760,
      ease: 'out(3)',
      delay: stagger(step, { start: delay }),
      autoplay: onScroll({ target: el, enter, sync: 'play', repeat: false }),
    })

    return () => {
      anim.revert()
      splitter.revert()
    }
  }, [reduced, unit, step, enter, delay])

  return ref
}
