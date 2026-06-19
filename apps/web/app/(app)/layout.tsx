'use client'

import { SidebarDesktop } from '@/components/layout/sidebar'
import { BottomBarMobile } from '@/components/layout/bottom-bar'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { connected } = useRealtimeSync()

  return (
    <div className="min-h-screen flex">
      <SidebarDesktop />
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
        {!connected && (
          <div
            role="status"
            aria-live="polite"
            className="bg-accent-red/10 border-b border-accent-red/20 text-accent-red text-xs text-center py-1.5 px-4"
          >
            Reconectando ao tempo real…
          </div>
        )}
        {children}
      </div>
      <BottomBarMobile />

      {/* Brand gradient SVG defs */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="gBrand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7C3AED" />
            <stop offset="0.45" stopColor="#A855F7" />
            <stop offset="1" stopColor="#D946EF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
