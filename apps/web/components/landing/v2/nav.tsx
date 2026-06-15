'use client'

import { useEffect, useRef, useState } from 'react'
import { BetvLogo } from './betv-logo'
import styles from './landing.module.css'

const LINKS = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Recursos', href: '#bento' },
  { label: 'Transparência', href: '#transparencia' },
  { label: 'Preço', href: '#passe' },
]

export function LandingNav() {
  const segRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [active, setActive] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [pill, setPill] = useState({ left: 0, width: 0, show: false })

  // scroll-spy: which section is in view drives the active segment (IntersectionObserver,
  // never a window 'scroll' listener — per the project motion rules).
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1))
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (!sections.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          const idx = ids.indexOf(visible.target.id)
          if (idx >= 0) setActive(idx)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // the pill slides to the hovered segment, falling back to the in-view section.
  useEffect(() => {
    const idx = hover ?? active
    const el = idx != null ? linkRefs.current[idx] : null
    if (!el) {
      setPill((p) => ({ ...p, show: false }))
      return
    }
    setPill({ left: el.offsetLeft, width: el.offsetWidth, show: true })
  }, [hover, active])

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-5 sm:px-6 sm:pt-7">
      {/* 3-column grid: logo | centered pill | CTAs — the pill is truly centered and the columns
          can't overlap (fixes the CTA colliding with the last link). */}
      <nav className="mx-auto grid h-12 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* logo mark only — no "BetV" wordmark */}
        <a href="/landing" className="flex items-center justify-self-start" aria-label="BetV, início">
          <BetvLogo height={30} priority />
        </a>

        {/* center glass pill — the background sits ONLY here (just the nav links) */}
        <div
          ref={segRef}
          className={`${styles.navGlass} hidden items-center gap-1 rounded-full p-1.5 lg:flex`}
          onMouseLeave={() => setHover(null)}
        >
          <span
            aria-hidden
            className={styles.navPill}
            style={{ left: pill.left, width: pill.width, opacity: pill.show ? 1 : 0 }}
          />
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              ref={(el) => {
                linkRefs.current[i] = el
              }}
              href={l.href}
              onMouseEnter={() => setHover(i)}
              aria-current={active === i ? 'true' : undefined}
              className={styles.navLink}
              style={active === i ? { color: 'var(--text-hi)' } : undefined}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs — right, outside the pill */}
        <div className="flex items-center justify-self-end gap-2">
          <a
            href="/login"
            className="rounded-pill px-3 py-2 text-[13px] font-medium text-text-mid transition-colors hover:text-text-hi"
          >
            Entrar
          </a>
          <a href="/checkout" className={`${styles.navCta} text-[12px] sm:text-[13px]`}>
            Garantir meu passe
          </a>
        </div>
      </nav>
    </header>
  )
}
