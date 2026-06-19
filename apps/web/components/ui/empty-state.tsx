import type { ReactNode } from 'react'

/**
 * Estado vazio reutilizável: borda tracejada + ícone (iconsax) + título + descrição opcional.
 * Use no lugar de fabricar linhas/placeholders quando uma lista não tem dados.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-card border border-dashed border-border-subtle bg-white/[0.015] px-6 py-8 text-center ${className}`}
    >
      {icon && (
        <span className="text-text-muted" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="font-display text-sm font-bold text-text-secondary">{title}</p>
      {description && <p className="max-w-xs text-xs leading-relaxed text-text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
