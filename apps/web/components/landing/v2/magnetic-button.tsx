'use client'

import { useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import styles from './landing.module.css'

type Props = {
  children: ReactNode
  href: string
  variant?: 'primary' | 'ghost'
  className?: string
  strength?: number
  ariaLabel?: string
  trailingIcon?: ReactNode // dark arrow; on hover the white orbe swallows the button (see CSS)
  magnetic?: boolean // cursor-drift effect (off for the hero CTAs)
}

/**
 * CTA anchor. Optional magnetic cursor-drift + light shine. With a trailingIcon (the primary
 * hero CTA) it gets the "white orbe swallows the button" hover: a white circle anchored right
 * expands to fill, the label slides out, and the dark arrow migrates to centre — all in CSS.
 */
export function MagneticButton({
  children,
  href,
  variant = 'primary',
  className = '',
  strength = 0.4,
  ariaLabel,
  trailingIcon,
  magnetic = true,
}: Props) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLAnchorElement>(null)
  const reduced = useReducedMotion()

  function handleMove(e: React.MouseEvent) {
    if (reduced) return
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return
    const rect = wrap.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const relY = e.clientY - rect.top
    inner.style.setProperty('--mx', `${relX}px`)
    inner.style.setProperty('--my', `${relY}px`)
    if (magnetic) {
      wrap.style.transform = `translate(${(relX - rect.width / 2) * strength}px, ${(relY - rect.height / 2) * strength}px)`
    }
  }

  function handleLeave() {
    if (wrapRef.current) wrapRef.current.style.transform = 'translate(0px, 0px)'
  }

  const base =
    'group relative inline-flex items-center justify-center gap-2.5 rounded-button px-7 py-3.5 text-sm font-semibold tracking-tight transition-[box-shadow,background-color] duration-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft'
  const variantClass =
    variant === 'primary'
      ? `${styles.ctaPrimary}${trailingIcon ? ` ${styles.ctaArrow}` : ''} text-white`
      : styles.ctaGlass

  return (
    <span
      ref={wrapRef}
      className={styles.magneticWrap}
      style={{ transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <a ref={innerRef} href={href} aria-label={ariaLabel} className={`${base} ${variantClass} ${className}`}>
        <span className={styles.ctaLabel}>{children}</span>
        {trailingIcon && (
          <span aria-hidden="true" className={styles.ctaArrowIcon}>
            {trailingIcon}
          </span>
        )}
      </a>
    </span>
  )
}
