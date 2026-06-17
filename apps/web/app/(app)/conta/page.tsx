'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { animate, utils } from 'animejs'
import { SUBSCRIPTION_DAYS, RENEWAL_UNLOCK_DAYS, RECURRING_AMOUNT_BRL } from '@betv/shared'
import { AppHeader } from '@/components/layout/app-header'
import { GlassCard } from '@/components/ui/glass-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useCountUp } from '@/hooks/use-count-up'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useSession } from '@/hooks/use-session'
import { useQuery } from '@tanstack/react-query'

export default function ContaPage() {
  const { session, loading: sessionLoading, logout, refresh } = useSession()
  const user = session?.user
  const daysRemaining = session?.daysRemaining ?? 0
  const progress = Math.min(1, daysRemaining / SUBSCRIPTION_DAYS)
  const canRenew = daysRemaining <= RENEWAL_UNLOCK_DAYS

  const sub = session?.subscription
  const isRecurring = sub?.type === 'recorrente_cartao'
  const [cancelling, setCancelling] = useState(false)
  async function handleCancel() {
    if (!window.confirm('Cancelar sua assinatura? Você mantém o acesso até o fim do período já pago.')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/conta/cancelar', { method: 'POST' })
      if (res.ok) await refresh()
    } finally {
      setCancelling(false)
    }
  }

  const daysRef = useCountUp<HTMLSpanElement>(daysRemaining)
  const reduced = useReducedMotion()
  const barRef = useRef<HTMLDivElement>(null)

  // Fill the subscription bar via scaleX (transform only) once the value is known.
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    if (reduced) {
      utils.set(bar, { scaleX: progress })
      return
    }
    const anim = animate(bar, {
      scaleX: [0, progress],
      duration: 900,
      ease: 'out(3)',
    })
    return () => {
      anim.revert()
    }
  }, [progress, reduced])

  const { data: payments } = useQuery({
    queryKey: ['account-payments'],
    queryFn: async () => {
      const res = await fetch('/api/account/payments')
      if (!res.ok) return { payments: [] }
      return res.json()
    },
    select: (d: any) => d.payments ?? [],
  })

  const { data: stats } = useQuery({
    queryKey: ['account-stats'],
    queryFn: async () => {
      const res = await fetch('/api/account/stats')
      if (!res.ok) return null
      return res.json() as Promise<{ consultasChat: number; oddsAvaliadas: number; diasAtivos: number }>
    },
  })

  if (sessionLoading) {
    return (
      <>
        <AppHeader title="Minha Conta" />
        <div className="px-8 flex flex-col gap-4 max-w-2xl">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
      </>
    )
  }

  return (
    <>
      <AppHeader title="Minha Conta" userName={user?.name} />
      <div className="flex flex-col gap-5 px-8 max-w-2xl animate-screenIn">
        {isRecurring ? (
          <GlassCard>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold tracking-widest text-text-muted uppercase">Assinatura BetV</span>
                <span className={`ml-auto rounded-pill px-3 py-1 text-xs font-bold ${
                  sub?.status === 'cancelled'
                    ? 'border border-border-subtle bg-bg-subtle text-text-muted'
                    : 'border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.10)] text-accent-green-text'
                }`}>
                  {sub?.status === 'trial' ? 'TESTE GRÁTIS' : sub?.status === 'cancelled' ? 'CANCELADA' : 'ATIVA'}
                </span>
              </div>

              {sub?.status === 'trial' && (
                <p className="text-sm text-text-secondary">
                  Teste grátis até <strong className="text-text-primary">{fmtDate(sub.trialEndsAt)}</strong>. Primeira cobrança em{' '}
                  <strong className="text-text-primary">{fmtDate(sub.nextChargeAt)}</strong> · {brl(RECURRING_AMOUNT_BRL)}/mês.
                </p>
              )}
              {sub?.status === 'active' && (
                <p className="text-sm text-text-secondary">
                  Assinatura ativa · próxima cobrança em <strong className="text-text-primary">{fmtDate(sub.nextChargeAt)}</strong> ·{' '}
                  {brl(RECURRING_AMOUNT_BRL)}/mês.
                </p>
              )}
              {sub?.status === 'cancelled' && (
                <p className="text-sm text-text-secondary">
                  Cancelada — sem novas cobranças. Você mantém o acesso até{' '}
                  <strong className="text-text-primary">{fmtDate(session?.expiresAt ?? null)}</strong>.
                </p>
              )}

              {(sub?.status === 'trial' || sub?.status === 'active') && (
                <Button size="sm" variant="secondary" loading={cancelling} onClick={handleCancel} className="self-start">
                  Cancelar assinatura
                </Button>
              )}
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold tracking-widest text-text-muted uppercase">Passe BetV</span>
                <span className={`ml-auto rounded-pill px-3 py-1 text-xs font-bold ${
                  session?.hasActiveSubscription
                    ? 'bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.35)] text-accent-green-text'
                    : 'bg-[rgba(251,77,109,0.10)] border border-[rgba(251,77,109,0.35)] text-accent-red'
                }`}>
                  {session?.hasActiveSubscription ? 'ATIVO' : 'EXPIRADO'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span ref={daysRef} className="font-display font-extrabold text-[42px] tabular-nums text-accent-green-text">0</span>
                <span className="text-sm text-text-secondary">dias restantes</span>
              </div>
              <div
                className="h-2 rounded-full bg-bg-subtle overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={SUBSCRIPTION_DAYS}
                aria-valuenow={daysRemaining}
              >
                <div
                  ref={barRef}
                  className="h-full w-full origin-left rounded-full bg-brand-gradient will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
              <div className="flex flex-col gap-1 pt-1">
                {canRenew ? (
                  <Link href="/renovar" className="self-start">
                    <Button size="sm">Renovar passe</Button>
                  </Link>
                ) : (
                  <>
                    <Button size="sm" disabled className="self-start">Renovar passe</Button>
                    <p role="note" className="text-xs text-text-muted">
                      A renovação abre quando faltarem {RENEWAL_UNLOCK_DAYS} dias para expirar.
                    </p>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">Seu uso</h3>
            <div className="grid grid-cols-3 gap-3">
              <UsageStat label="Consultas no chat" value={stats?.consultasChat} />
              <UsageStat label="Odds avaliadas" value={stats?.oddsAvaliadas} />
              <UsageStat label="Dias ativos" value={stats?.diasAtivos} />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">Perfil</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold tracking-wider text-text-muted">NOME</label>
                <input defaultValue={user?.name ?? ''} className="bg-bg-primary border border-border-input rounded-input px-4 py-2.5 text-sm text-text-primary outline-none focus:border-brand-violet transition-colors" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold tracking-wider text-text-muted">E-MAIL</label>
                <input defaultValue={user?.email ?? ''} disabled className="bg-bg-primary border border-border-input rounded-input px-4 py-2.5 text-sm text-text-muted outline-none cursor-not-allowed" />
              </div>
            </div>
            <button className="self-start bg-brand-gradient rounded-button px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px active:scale-95">
              Salvar alteracoes
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">Historico de pagamentos</h3>
            {(!payments || payments.length === 0) ? (
              <p className="text-sm text-text-muted">Nenhum pagamento registrado.</p>
            ) : payments.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border-subtle">
                <span className="font-mono text-[11px] text-text-muted">{new Date(p.criadoEm).toLocaleDateString('pt-BR')}</span>
                <span className="text-sm text-text-primary">Passe 45 dias</span>
                <span className="ml-auto font-mono text-sm font-semibold text-accent-green-text">R$ {p.amount?.toFixed(2)}</span>
                <span className={`text-[10px] font-bold tracking-wider rounded-pill px-2 py-0.5 ${
                  p.status === 'approved' ? 'text-accent-green-text bg-[rgba(34,197,94,0.10)]' : 'text-text-muted bg-bg-subtle'
                }`}>{p.status === 'approved' ? 'PAGO' : p.status?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="border-accent-red/20">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-widest text-accent-red uppercase">Zona de perigo</h3>
            <p className="text-sm text-text-secondary">
              Ao excluir sua conta, seus dados serao removidos em ate 30 dias (LGPD).
            </p>
            <div className="flex gap-3">
              <button onClick={logout} className="border border-border rounded-button px-5 py-2.5 text-sm font-semibold text-text-secondary hover:border-border-hover">
                Sair da conta
              </button>
              <button className="border border-accent-red/30 rounded-button px-5 py-2.5 text-sm font-semibold text-accent-red hover:bg-[rgba(251,77,109,0.08)]">
                Excluir minha conta
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </>
  )
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function fmtDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : '—'
}

function UsageStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card/40 p-3">
      <span className="font-display text-2xl font-extrabold tabular-nums text-text-primary">{value ?? '—'}</span>
      <span className="text-[11px] leading-tight text-text-muted">{label}</span>
    </div>
  )
}
