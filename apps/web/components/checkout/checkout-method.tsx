'use client'

import { useLayoutEffect, useRef } from 'react'
import { Wallet2, Card, Flash, Gift, ArrowLeft, ArrowRight, ShieldTick } from 'iconsax-reactjs'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'
import { utils } from 'animejs'

/** Card de escolha grande e óbvio (toque confortável). Destaque opcional = borda/realce verde. */
function ChoiceCard({
  icon,
  title,
  subtitle,
  badge,
  highlight,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
  highlight?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-4 rounded-card border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
        highlight
          ? 'border-accent-green/45 bg-accent-green/[0.06] hover:border-accent-green/70 hover:shadow-glow-green'
          : 'border-border-input bg-bg-card hover:border-brand-violet/50 hover:shadow-glow-brand'
      }`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-input ${
          highlight ? 'bg-accent-green/12 text-accent-green-text' : 'bg-brand-violet/12 text-brand-soft'
        }`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-text-primary">{title}</span>
          {badge && (
            <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold tracking-wide ${highlight ? 'bg-accent-green/15 text-accent-green-text' : 'bg-brand-violet/15 text-brand-soft'}`}>
              {badge}
            </span>
          )}
        </span>
        <span className="text-sm text-text-secondary">{subtitle}</span>
      </span>
      <ArrowRight size={20} variant="Linear" color="currentColor" aria-hidden="true" className="ml-auto shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

function useColumnReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const col = ref.current
    if (!col) return
    const children = Array.from(col.children) as Element[]
    if (!prefersReducedMotion()) utils.set(children, { opacity: 0 })
    const anim = staggerReveal(children, { y: 10, delayStep: 60 })
    return () => {
      anim?.revert()
    }
  }, [])
  return ref
}

/** Passo 1: PIX (destaque) × Cartão. Óbvio em 3 segundos. */
export function MethodChoice({ onPix, onCard }: { onPix: () => void; onCard: () => void }) {
  const ref = useColumnReveal()
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold text-text-primary">Como você quer pagar?</h2>
      <ChoiceCard
        icon={<Wallet2 size={24} variant="Bold" color="currentColor" aria-hidden="true" />}
        title="PIX"
        subtitle="À vista · acesso na hora · o mais rápido"
        badge="RECOMENDADO"
        highlight
        onClick={onPix}
      />
      <ChoiceCard
        icon={<Card size={24} variant="Bold" color="currentColor" aria-hidden="true" />}
        title="Cartão"
        subtitle="Pagar agora ou começar com 2 dias grátis"
        onClick={onCard}
      />
      <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-text-muted">
        <ShieldTick size={14} variant="Linear" color="currentColor" aria-hidden="true" />
        Pagamento processado pelo Mercado Pago
      </p>
    </div>
  )
}

/** Passo 2 (cartão): "Pagar agora" × "2 dias grátis" — cada um com termos explícitos. */
export function CardPlanChoice({ onNow, onTrial, onBack }: { onNow: () => void; onTrial: () => void; onBack: () => void }) {
  const ref = useColumnReveal()
  return (
    <div className="flex flex-col gap-3">
      <BackButton onClick={onBack} />
      <div ref={ref} className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold text-text-primary">No cartão, como prefere?</h2>
        <ChoiceCard
          icon={<Flash size={24} variant="Bold" color="currentColor" aria-hidden="true" />}
          title="Pagar agora"
          subtitle="R$ 14,90 à vista · 45 dias · sem recorrência"
          onClick={onNow}
        />
        <ChoiceCard
          icon={<Gift size={24} variant="Bold" color="currentColor" aria-hidden="true" />}
          title="2 dias grátis"
          subtitle="Teste sem pagar agora · depois R$ 14,90/mês · cancele quando quiser"
          badge="2 DIAS GRÁTIS"
          highlight
          onClick={onTrial}
        />
      </div>
    </div>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 self-start text-sm text-text-muted transition-colors hover:text-text-primary"
    >
      <ArrowLeft size={16} variant="Linear" color="currentColor" aria-hidden="true" />
      Voltar
    </button>
  )
}
