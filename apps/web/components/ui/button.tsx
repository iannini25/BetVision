'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Refresh } from 'iconsax-reactjs'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  fullWidth?: boolean
}

// Shared tactile button: lifts on hover, presses on :active (physical feel for a
// touch-first betting app), shows an iconsax spinner while loading. Replaces the
// ad-hoc inline button classes duplicated across the auth/error pages.
const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-button whitespace-nowrap select-none ' +
  'transition-[transform,box-shadow,background-color,border-color,opacity] duration-150 ease-out ' +
  'hover:-translate-y-px active:translate-y-0 active:scale-[0.97] active:duration-75 ' +
  'disabled:opacity-60 disabled:pointer-events-none focus-visible:shadow-glow-brand'

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-brand-gradient shadow-[0_8px_24px_-8px_rgba(124,58,237,0.6)] hover:shadow-[0_12px_30px_-8px_rgba(168,85,247,0.7)]',
  secondary: 'text-text-primary bg-bg-card border border-border hover:border-border-hover',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-card/60',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, fullWidth, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <Refresh size={size === 'sm' ? 16 : 18} color="currentColor" variant="Linear" className="animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  )
})
