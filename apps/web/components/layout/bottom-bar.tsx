'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home2, Discover, MessageText1, Profile, type Icon as IconType } from 'iconsax-reactjs'

const ITEMS: { href: string; label: string; Icon: IconType }[] = [
  { href: '/hoje', label: 'Hoje', Icon: Home2 },
  { href: '/explorar', label: 'Explorar', Icon: Discover },
  { href: '/chat', label: 'Chat', Icon: MessageText1 },
  { href: '/conta', label: 'Conta', Icon: Profile },
]

export function BottomBarMobile() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary/95 backdrop-blur-xl border-t border-border flex items-stretch justify-around py-2 px-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 px-3 pt-2 pb-1 rounded-lg text-[10px] font-semibold tracking-wide transition-colors duration-200 active:scale-[0.94] active:translate-y-0 ${
              active ? 'text-brand-violet' : 'text-text-muted'
            }`}
          >
            {/* Active indicator: a small pill above the icon, motion via transform/opacity only */}
            <span
              aria-hidden
              className={`absolute top-0.5 h-1 w-6 rounded-full bg-brand-gradient origin-center transition-transform duration-200 motion-reduce:transition-none ${
                active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
              }`}
            />
            <Icon
              size={22}
              variant={active ? 'Bold' : 'Linear'}
              color="currentColor"
              aria-hidden
              className={`transition-transform duration-200 motion-reduce:transition-none ${
                active ? 'scale-110' : 'scale-100'
              }`}
            />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
