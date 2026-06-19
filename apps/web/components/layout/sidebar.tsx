'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { animate, utils } from 'animejs'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const NAV_ITEMS = [
  { href: '/hoje', label: 'Hoje', icon: 'calendar' },
  { href: '/explorar', label: 'Explorar', icon: 'compass' },
  { href: '/chat', label: 'Chat', icon: 'chat' },
  { href: '/modelo', label: 'Modelo', icon: 'chart' },
  { href: '/conta', label: 'Conta', icon: 'user' },
]

const ICONS: Record<string, JSX.Element> = {
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      <circle cx="12" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  compass: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" />
    </svg>
  ),
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.25-3.4-.7L3 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-6 4 3 6-8 3 4" />
      <path d="M3 21h18" />
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  ),
}

export function SidebarDesktop() {
  const pathname = usePathname()
  const reduced = useReducedMotion()

  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const mounted = useRef(false)

  const activeIndex = NAV_ITEMS.findIndex((item) => pathname.startsWith(item.href))

  // Slide a single pill to the active link. Measured from the link's real position
  // inside the nav so it survives layout/logo height changes. Reduced motion snaps.
  useEffect(() => {
    const pill = indicatorRef.current
    const nav = navRef.current
    const link = linkRefs.current[activeIndex]
    if (!pill || !nav) return

    if (activeIndex < 0 || !link) {
      utils.set(pill, { opacity: 0 })
      return
    }

    const top = link.offsetTop
    const height = link.offsetHeight

    // First paint or reduced motion: snap without sliding.
    if (!mounted.current || reduced) {
      utils.set(pill, { translateY: top, height, opacity: 1 })
      mounted.current = true
      return
    }

    const anim = animate(pill, {
      translateY: top,
      height,
      opacity: 1,
      duration: 420,
      ease: 'out(3)',
    })
    return () => {
      anim.revert()
    }
  }, [activeIndex, reduced])

  return (
    <nav
      ref={navRef}
      className="hidden md:flex w-[88px] flex-none bg-bg-secondary border-r border-border flex-col items-center gap-2 py-5 sticky top-0 h-screen z-40"
    >
      <div className="flex flex-col items-center gap-0.5 mb-4">
        <div className="w-[50px] h-[50px] bg-brand-gradient rounded-2xl flex items-center justify-center">
          <span className="font-display font-bold text-white text-lg">B</span>
        </div>
        <span className="font-display font-bold text-[11px] tracking-wider text-text-primary">BetV</span>
      </div>

      {/* Sliding active indicator: a left bar pinned to the active link. */}
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 w-[3px] rounded-r-full bg-brand-gradient opacity-0 will-change-transform"
      />

      {NAV_ITEMS.map((item, i) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            ref={(el) => {
              linkRefs.current[i] = el
            }}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`
              flex flex-col items-center gap-1 w-16 py-2.5 rounded-button cursor-pointer transition-all duration-150 active:scale-[0.96]
              ${active
                ? 'bg-[rgba(139,92,246,0.12)] border border-[rgba(168,85,247,0.35)] text-brand-violet'
                : 'border border-transparent text-text-muted hover:text-text-secondary'
              }
            `}
          >
            {ICONS[item.icon]}
            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          </Link>
        )
      })}

      <div className="flex-1" />
      <span className="text-[10px] font-bold text-text-muted border border-border rounded-md px-1.5 py-0.5 tracking-wide">
        18+
      </span>
    </nav>
  )
}
