'use client'

import { useId, useRef, useState, type ReactNode } from 'react'

export type TabItem = { id: string; label: string; content: ReactNode }

/**
 * Accessible tab control (WAI-ARIA tabs pattern): roving tabindex, arrow-key
 * navigation, and a single visible panel. Content is mounted only when active so
 * each panel's data fetch starts on first view.
 */
export function Tabs({ items, ariaLabel }: { items: TabItem[]; ariaLabel: string }) {
  const [active, setActive] = useState(items[0]?.id)
  const base = useId()
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  function focusTab(index: number) {
    const target = items[(index + items.length) % items.length]
    if (!target) return
    setActive(target.id)
    tabRefs.current[target.id]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') { e.preventDefault(); focusTab(index + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusTab(index - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusTab(0) }
    else if (e.key === 'End') { e.preventDefault(); focusTab(items.length - 1) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 overflow-x-auto border-b border-border-subtle -mb-px"
      >
        {items.map((item, index) => {
          const selected = item.id === active
          return (
            <button
              key={item.id}
              ref={(el) => { tabRefs.current[item.id] = el }}
              role="tab"
              id={`${base}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`
                whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold tracking-wide border-b-2 transition-colors
                ${selected
                  ? 'border-accent-green text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
                }
              `}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          tabIndex={item.id === active ? 0 : undefined}
          hidden={item.id !== active}
        >
          {item.id === active && item.content}
        </div>
      ))}
    </div>
  )
}
