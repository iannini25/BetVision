'use client'

import { useState } from 'react'
import { SUBSCRIPTION_PRICE_BRL, SUBSCRIPTION_DAYS, isValidCpf, maskCpf, type PaymentMethod } from '@betv/shared'
import { Button } from '@/components/ui/button'
import { MaskedInput } from '@/components/ui/masked-input'
import type { BrickFormData } from '@/lib/mp/use-checkout'

// PIX em destaque (primeiro + recomendado); os demais como secundários. Nenhum método é bloqueado.
const METHODS: { id: PaymentMethod; label: string; recommended?: boolean }[] = [
  { id: 'pix', label: 'PIX', recommended: true },
  { id: 'credit', label: 'Crédito' },
  { id: 'debit', label: 'Débito' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'wallet', label: 'Saldo MP' },
]
const NEEDS_CPF = new Set<PaymentMethod>(['credit', 'debit', 'boleto'])
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Checkout simulado (sem chave do MP): espelha a forma do onSubmit do Brick. Preço FIXO R$14,90 em
// todos os métodos (a taxa do MP é absorvida) — o mesmo valor que o backend e o Brick real cobram.
export function MockCheckout({
  onPay,
  submitting,
  error,
}: {
  onPay: (method: PaymentMethod, form: BrickFormData) => void
  submitting: boolean
  error?: string
}) {
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [cpf, setCpf] = useState('')
  const [cpfError, setCpfError] = useState('')

  function handlePay() {
    setCpfError('')
    if (NEEDS_CPF.has(method) && !isValidCpf(cpf)) {
      setCpfError('CPF inválido')
      return
    }
    const form: BrickFormData = NEEDS_CPF.has(method)
      ? { payer: { identification: { type: 'CPF', number: cpf.replace(/\D/g, '') } } }
      : {}
    onPay(method, form)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-border-subtle bg-bg-card/40 p-4 flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary">Passe da Copa</span>
          <span className="text-xs text-text-muted">{SUBSCRIPTION_DAYS} dias · a Copa inteira</span>
        </div>
        <span className="font-display text-2xl font-extrabold">{brl(SUBSCRIPTION_PRICE_BRL)}</span>
      </div>

      <fieldset className="flex flex-col">
        <legend className="text-xs font-bold tracking-widest text-text-muted uppercase mb-2">Forma de pagamento</legend>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              aria-pressed={method === m.id}
              className={`relative rounded-input border px-3 py-2.5 text-sm transition-colors ${
                method === m.id
                  ? 'border-brand-violet bg-bg-card text-text-primary'
                  : 'border-border-input text-text-secondary hover:border-border-hover'
              } ${m.recommended ? 'col-span-3 font-semibold' : ''}`}
            >
              {m.label}
              {m.recommended && (
                <span className="ml-2 rounded-pill bg-brand-violet/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-violet align-middle">
                  RECOMENDADO
                </span>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      {NEEDS_CPF.has(method) && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cpf" className="text-xs font-semibold tracking-wider text-text-muted uppercase">
            CPF
          </label>
          <MaskedInput id="cpf" value={cpf} onChange={setCpf} mask={maskCpf} placeholder="000.000.000-00" aria-invalid={!!cpfError} />
          {cpfError && <p role="alert" className="text-sm text-accent-red">{cpfError}</p>}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}

      <Button onClick={handlePay} loading={submitting} fullWidth>
        Pagar {brl(SUBSCRIPTION_PRICE_BRL)}
      </Button>
      <p className="text-[11px] text-text-muted text-center">Ambiente de simulação (sem chave do Mercado Pago).</p>
    </div>
  )
}
