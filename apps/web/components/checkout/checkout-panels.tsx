'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Wallet2, Flash, Gift, Calendar, Refresh, ShieldTick } from 'iconsax-reactjs'
import {
  SUBSCRIPTION_PRICE_BRL,
  SUBSCRIPTION_DAYS,
  RECURRING_AMOUNT_BRL,
  TRIAL_DAYS,
  isValidCpf,
  maskCpf,
} from '@betv/shared'
import { Button } from '@/components/ui/button'
import { MaskedInput } from '@/components/ui/masked-input'
import { Skeleton } from '@/components/ui/skeleton'
import { BackButton } from './checkout-method'
import type { BrickFormData } from '@/lib/mp/use-checkout'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtShort = (d: Date) => `${d.getDate()} ${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`

const BrickCheckout = dynamic(() => import('./brick-checkout'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-card" />,
})

/** Linha de preço grande e limpa (taxa absorvida — R$14,90 fixo). */
function PriceLine() {
  return (
    <div className="flex items-baseline justify-between rounded-card border border-border-subtle bg-bg-card/40 p-4">
      <div className="flex flex-col">
        <span className="text-sm text-text-secondary">Passe da Copa</span>
        <span className="text-xs text-text-muted">{SUBSCRIPTION_DAYS} dias · a Copa inteira</span>
      </div>
      <span className="font-display text-2xl font-extrabold text-text-primary">{brl(SUBSCRIPTION_PRICE_BRL)}</span>
    </div>
  )
}

/** CPF — exigido para cartão/boleto. Mock-only: o Brick real coleta a identificação no iframe seguro. */
function CpfField({ cpf, setCpf, error }: { cpf: string; setCpf: (v: string) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cpf" className="text-xs font-semibold tracking-wider text-text-muted uppercase">CPF</label>
      <MaskedInput id="cpf" value={cpf} onChange={setCpf} mask={maskCpf} placeholder="000.000.000-00" aria-invalid={!!error} />
      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}
    </div>
  )
}

/** PIX avulso à vista — termos explícitos + arrependimento de 7 dias. */
export function PixPanel({
  onPay,
  submitting,
  error,
  onBack,
}: {
  onPay: (form: BrickFormData) => void
  submitting: boolean
  error?: string
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <BackButton onClick={onBack} />
      <PriceLine />
      <div className="flex flex-col gap-2 rounded-card border border-accent-green/30 bg-accent-green/[0.05] p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-accent-green-text">
          <Wallet2 size={18} variant="Bold" color="currentColor" aria-hidden="true" />
          À vista no PIX — acesso na hora
        </p>
        <p className="text-text-secondary">
          R$ 14,90 pagos uma vez, acesso por <strong className="text-text-primary">45 dias</strong>.{' '}
          <strong className="text-text-primary">Sem renovação automática</strong> — quando acabar, você renova quando quiser.
        </p>
        <p className="text-text-muted">Direito de arrependimento: 7 dias após a compra (Código de Defesa do Consumidor).</p>
      </div>
      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}
      <Button onClick={() => onPay({})} loading={submitting} fullWidth leftIcon={<Wallet2 size={18} variant="Bold" color="currentColor" aria-hidden="true" />}>
        Gerar PIX de {brl(SUBSCRIPTION_PRICE_BRL)}
      </Button>
    </div>
  )
}

/** Cartão à vista (avulso). Mock: CPF + botão; Real: Payment Brick (cartão). */
export function CardNowPanel({
  mock,
  publicKey,
  onPay,
  onError,
  submitting,
  error,
  onBack,
}: {
  mock: boolean
  publicKey: string
  onPay: (form: BrickFormData) => void
  onError: (m: string) => void
  submitting: boolean
  error?: string
  onBack: () => void
}) {
  const [cpf, setCpf] = useState('')
  const [cpfError, setCpfError] = useState('')

  function payMock() {
    setCpfError('')
    if (!isValidCpf(cpf)) {
      setCpfError('CPF inválido')
      return
    }
    onPay({ payer: { identification: { type: 'CPF', number: cpf.replace(/\D/g, '') } } })
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton onClick={onBack} />
      <PriceLine />
      <div className="flex items-center gap-2 rounded-card border border-border-subtle bg-bg-card/40 p-3 text-sm text-text-secondary">
        <Flash size={18} variant="Bold" color="currentColor" aria-hidden="true" className="text-brand-soft" />
        R$ 14,90 à vista no cartão · 45 dias · <strong className="text-text-primary">sem recorrência</strong>.
      </div>
      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}
      {mock ? (
        <>
          <CpfField cpf={cpf} setCpf={setCpf} error={cpfError} />
          <Button onClick={payMock} loading={submitting} fullWidth>Pagar {brl(SUBSCRIPTION_PRICE_BRL)}</Button>
          <p className="text-center text-[11px] text-text-muted">Ambiente de simulação (sem chave do Mercado Pago).</p>
        </>
      ) : (
        <BrickCheckout publicKey={publicKey} cardOnly onPay={(_m, f) => onPay(f)} onError={onError} />
      )}
    </div>
  )
}

/** 2 dias grátis (recorrente) — transparência RADICAL + consentimento explícito. */
export function TrialPanel({
  mock,
  onSubscribe,
  submitting,
  error,
  onBack,
}: {
  mock: boolean
  onSubscribe: (cardToken: string) => void
  submitting: boolean
  error?: string
  onBack: () => void
}) {
  const [cpf, setCpf] = useState('')
  const [cpfError, setCpfError] = useState('')
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState(false)

  const firstCharge = new Date(Date.now() + TRIAL_DAYS * 86_400_000)

  function toggleConsent(checked: boolean) {
    setConsent(checked)
    if (checked) setConsentError(false)
  }

  function start() {
    setCpfError('')
    let ok = true
    if (mock && !isValidCpf(cpf)) {
      setCpfError('CPF inválido')
      ok = false
    }
    if (!consent) {
      setConsentError(true)
      ok = false
    }
    if (!ok) return
    // Mock: token fake; Real: o token vem do CardPayment Brick (não implementado neste mock).
    onSubscribe('mock-card-token')
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton onClick={onBack} />

      {/* Transparência GRITANTE — cronologia escaneável: o olho bate na cobrança em 1 segundo */}
      <div className="flex flex-col gap-3 rounded-card border border-brand-violet/50 bg-brand-violet/[0.07] p-4">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-text-primary">
          <Gift size={20} variant="Bold" color="currentColor" aria-hidden="true" className="text-accent-green-text" />
          2 dias grátis, sem cobrança agora
        </p>
        <ol className="flex flex-col gap-2.5">
          <TimelineRow
            icon={<Gift size={18} variant="Bold" color="currentColor" aria-hidden="true" />}
            iconClass="bg-accent-green/15 text-accent-green-text"
            label="Hoje"
            sub="Você não paga nada"
            value="R$ 0,00"
            valueClass="text-accent-green-text"
          />
          <TimelineRow
            icon={<Calendar size={18} variant="Bold" color="currentColor" aria-hidden="true" />}
            iconClass="bg-brand-violet/20 text-brand-soft"
            label={fmtShort(firstCharge)}
            sub="1ª cobrança no seu cartão"
            value={brl(RECURRING_AMOUNT_BRL)}
            valueClass="text-text-primary"
            strong
          />
          <TimelineRow
            icon={<Refresh size={18} variant="Bold" color="currentColor" aria-hidden="true" />}
            iconClass="bg-white/[0.06] text-text-secondary"
            label="Depois"
            sub="Todo mês · cancele quando quiser"
            value={`${brl(RECURRING_AMOUNT_BRL)}/mês`}
            valueClass="text-text-secondary"
          />
        </ol>
      </div>

      {mock ? (
        <CpfField cpf={cpf} setCpf={setCpf} error={cpfError} />
      ) : (
        <p className="rounded-card border border-border-subtle bg-bg-card/40 p-3 text-xs text-text-muted">
          O formulário seguro de cartão (Mercado Pago) aparece aqui quando a chave real está ativa.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          className={`flex items-start gap-3 rounded-card border p-3 text-sm text-text-secondary cursor-pointer transition-colors ${
            consentError ? 'border-accent-red bg-accent-red/[0.06]' : 'border-border-input bg-white/[0.02] hover:border-border-hover'
          }`}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => toggleConsent(e.target.checked)}
            aria-invalid={consentError}
            required
            className={`mt-0.5 h-6 w-6 shrink-0 rounded-md border-2 accent-brand-violet ${consentError ? 'border-accent-red' : 'border-border-input'}`}
          />
          <span>
            Li e concordo: após os {TRIAL_DAYS} dias grátis, <strong className="text-text-primary">{brl(RECURRING_AMOUNT_BRL)} serão cobrados todo mês</strong> no meu cartão até eu cancelar.
          </span>
        </label>
        {consentError && (
          <p role="alert" className="text-sm text-accent-red">
            Você precisa concordar para começar o teste.
          </p>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}

      <Button onClick={start} loading={submitting} fullWidth>
        Começar meus {TRIAL_DAYS} dias grátis
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
        <ShieldTick size={14} variant="Linear" color="currentColor" aria-hidden="true" />
        Sem cobrança hoje · cancele em 1 clique a qualquer momento
      </p>
    </div>
  )
}

/** Linha da cronologia de cobrança (ícone · momento · valor à direita) — valor escaneável. */
function TimelineRow({
  icon,
  iconClass,
  label,
  sub,
  value,
  valueClass,
  strong = false,
}: {
  icon: React.ReactNode
  iconClass: string
  label: string
  sub: string
  value: string
  valueClass: string
  strong?: boolean
}) {
  return (
    <li className="flex items-center gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-input ${iconClass}`}>{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        <span className="text-xs text-text-muted">{sub}</span>
      </div>
      <span className={`ml-auto shrink-0 font-display font-extrabold tabular-nums ${strong ? 'text-lg' : 'text-base'} ${valueClass}`}>
        {value}
      </span>
    </li>
  )
}
