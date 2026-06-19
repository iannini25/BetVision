'use client'

import { useEffect, useRef } from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { SUBSCRIPTION_PRICE_BRL, type PaymentMethod } from '@betv/shared'
import type { BrickFormData } from '@/lib/mp/use-checkout'

// initMercadoPago é imperativo e não-idempotente — guarda de módulo evita dupla init em StrictMode.
let mpInitialized = false

function mapMethod(selected: string): PaymentMethod {
  if (selected === 'credit_card') return 'credit'
  if (selected === 'debit_card') return 'debit'
  if (selected === 'ticket') return 'boleto'
  if (selected === 'bank_transfer') return 'pix'
  return 'wallet'
}

// Carregado via next/dynamic (ssr:false) só no modo real — o SDK não entra no bundle do mock.
export default function BrickCheckout({
  publicKey,
  onPay,
  onError,
  cardOnly = false,
}: {
  publicKey: string
  onPay: (method: PaymentMethod, form: BrickFormData) => Promise<void> | void
  onError: (message: string) => void
  /** Após a bifurcação "cartão", restringe o Brick a cartão (sem PIX/boleto/saldo) — clareza. */
  cardOnly?: boolean
}) {
  const initedRef = useRef(false)
  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    if (!mpInitialized) {
      initMercadoPago(publicKey, { locale: 'pt-BR' })
      mpInitialized = true
    }
  }, [publicKey])

  return (
    <Payment
      initialization={{ amount: SUBSCRIPTION_PRICE_BRL }}
      customization={{
        // Após a bifurcação "cartão", restringe o Brick a cartão (sem PIX/boleto/saldo).
        paymentMethods: cardOnly
          ? { creditCard: 'all', debitCard: 'all', maxInstallments: 1 }
          : { creditCard: 'all', debitCard: 'all', ticket: 'all', bankTransfer: 'all', mercadoPago: 'all', maxInstallments: 1 },
      }}
      onSubmit={async ({ selectedPaymentMethod, formData }: { selectedPaymentMethod: string; formData: BrickFormData }) => {
        await onPay(mapMethod(selectedPaymentMethod), formData)
      }}
      onError={(err: unknown) => {
        const message =
          err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Erro no formulário de pagamento'
        onError(message)
      }}
    />
  )
}
