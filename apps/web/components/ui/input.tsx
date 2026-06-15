'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

// Shared input: brand-glow focus ring (uses --shadow-glow-brand) + border shift,
// consistent placeholder. Replaces three slightly-different inline input styles
// across the auth forms.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={
        'h-11 w-full rounded-input border border-border-input bg-bg-card px-3.5 text-text-primary ' +
        'placeholder:text-text-muted/70 outline-none transition-[border-color,box-shadow] duration-200 ease-out ' +
        'focus:border-brand-violet focus:shadow-glow-brand ' +
        className
      }
      {...rest}
    />
  )
})
