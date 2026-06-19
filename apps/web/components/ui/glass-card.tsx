'use client'

import { type ReactNode } from 'react'

type GlassCardProps = {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className = '', hover = false, onClick }: GlassCardProps) {
  return (
    <div
      className={`
        bg-bg-card border border-border rounded-card p-5
        ${
          hover
            ? 'cursor-pointer transition-[transform,border-color,box-shadow] duration-200 ease-out ' +
              'hover:-translate-y-0.5 hover:shadow-card hover:border-border-hover ' +
              'active:translate-y-0 active:scale-[0.985] active:duration-75'
            : ''
        }
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
