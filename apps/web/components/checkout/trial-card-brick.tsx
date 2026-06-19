'use client'

import { useEffect, useRef } from 'react'
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react'
import { RECURRING_AMOUNT_BRL } from '@betv/shared'

// initMercadoPago é imperativo e não-idempotente — guarda de módulo evita dupla init em StrictMode.
let mpInitialized = false

/**
 * Tokeniza o cartão NO NOSSO site (sem redirect) para a assinatura recorrente: o CardPayment Brick
 * gera o `card_token` (com a Public Key) e devolvemos ao backend, que cria o preapproval do MP.
 * Carregado via next/dynamic (ssr:false) só no modo real — o SDK não entra no bundle do mock.
 * Só crédito (débito/pré-pago não fazem recorrência) e 1 parcela (assinatura).
 */
export default function TrialCardBrick({
  publicKey,
  onToken,
  onError,
}: {
  publicKey: string
  onToken: (cardToken: string) => Promise<void> | void
  onError: (message: string) => void
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
    <CardPayment
      initialization={{ amount: RECURRING_AMOUNT_BRL }}
      customization={{
        paymentMethods: { minInstallments: 1, maxInstallments: 1, types: { excluded: ['debit_card', 'prepaid_card'] } },
        visual: { hideFormTitle: true, texts: { formSubmit: 'Começar meus 2 dias grátis' } },
      }}
      onSubmit={async ({ token }) => {
        if (!token) {
          onError('Não foi possível validar o cartão. Confira os dados e tente de novo.')
          return
        }
        await onToken(token)
      }}
      onError={(err: unknown) => {
        const message =
          err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Erro no formulário de cartão'
        onError(message)
      }}
    />
  )
}
