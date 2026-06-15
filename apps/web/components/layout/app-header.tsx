'use client'

import Link from 'next/link'
import { LiveDot } from '@/components/ui/live-dot'
import { useBrtClock } from '@/hooks/use-brt-clock'

type AppHeaderProps = {
  title: string
  userName?: string
}

export function AppHeader({ title, userName }: AppHeaderProps) {
  const { time, date } = useBrtClock()
  const initials = userName
    ? userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="flex items-center gap-5 flex-wrap px-8 pt-5 pb-3.5">
      <div className="flex flex-col gap-0.5 mr-auto">
        <span className="text-xs font-semibold tracking-widest text-text-muted uppercase">
          {date}
        </span>
        <h1 className="font-display font-bold text-[26px] tracking-tight text-text-primary">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button className="flex items-center gap-2.5 bg-[rgba(139,92,246,0.06)] border border-border backdrop-blur-xl rounded-pill px-4 py-2 cursor-pointer transition-all duration-150 hover:border-border-hover hover:-translate-y-px">
          <LiveDot size={8} />
          <span className="text-[13px] font-medium text-text-secondary">
            Agente ativo &middot; <span className="text-text-primary font-semibold">monitorando 4 jogos</span>
          </span>
        </button>
        <div className="flex items-baseline gap-1.5 bg-bg-secondary border border-border rounded-pill px-4 py-2">
          <span className="font-mono font-semibold text-sm text-text-primary tabular-nums">{time}</span>
          <span className="text-[11px] font-semibold tracking-wider text-text-muted">BRT</span>
        </div>
        <Link
          href="/conta"
          className="w-[38px] h-[38px] rounded-full bg-brand-gradient flex items-center justify-center font-display font-bold text-[13px] text-white cursor-pointer transition-transform hover:-translate-y-px active:scale-95"
        >
          {initials}
        </Link>
      </div>
    </header>
  )
}
