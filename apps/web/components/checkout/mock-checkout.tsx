'use client'

import { useState } from 'react'
import {
  MP_FEES,
  SUBSCRIPTION_PRICE_BRL,
  calcFee,
  calcTotal,
  isValidCpf,
  maskCpf,
  type PaymentMethod,
} from '@betv/shared'
import { Button } from '@/components/ui/button'
import { MaskedInput } from '@/components/ui/masked-input'
import type { BrickFormData } from '@/lib/mp/use-checkout'

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'pix', label: 'PIX' },
  { id: 'credit', label: 'Crédito' },
  { id: 'debit', label: 'Débito' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'wallet', label: 'Saldo MP' },
]
const NEEDS_CPF = new Set<PaymentMethod>(['credit', 'debit', 'boleto'])
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Checkout simulado (sem chave do MP): espelha a forma do onSubmit do Brick e mostra a taxa
// dinâmica por método de forma transparente, exatamente como na versão real.
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

  const fee = calcFee(SUBSCRIPTION_PRICE_BRL, method)
  const total = calcTotal(SUBSCRIPTION_PRICE_BRL, method)
  const feeLabel =
    method === 'boleto'
      ? 'Taxa de processamento'
      : `Taxa de processamento (${(MP_FEES[method] * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)`

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
      <fieldset className="flex flex-col">
        <legend className="text-xs font-bold tracking-widest text-text-muted uppercase mb-2">Forma de pagamento</legend>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              aria-pressed={method === m.id}
              className={`rounded-input border px-3 py-2.5 text-sm transition-colors ${
                method === m.id
                  ? 'border-brand-violet bg-bg-card text-text-primary'
                  : 'border-border-input text-text-secondary hover:border-border-hover'
              }`}
            >
              {m.label}
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

      <div className="rounded-card border border-border-subtle bg-bg-card/40 p-4 text-sm flex flex-col gap-1.5">
        <div className="flex justify-between text-text-secondary">
          <span>Passe da Copa</span>
          <span>{brl(SUBSCRIPTION_PRICE_BRL)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>{feeLabel}</span>
          <span>+ {brl(fee)}</span>
        </div>
        <div className="h-px bg-border-subtle my-1" />
        <div className="flex justify-between font-semibold text-text-primary">
          <span>Total</span>
          <span>{brl(total)}</span>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}

      <Button onClick={handlePay} loading={submitting} fullWidth>
        Pagar {brl(total)}
      </Button>
      <p className="text-[11px] text-text-muted text-center">Ambiente de simulação (sem chave do Mercado Pago).</p>
    </div>
  )
}
