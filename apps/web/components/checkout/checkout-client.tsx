'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import Link from 'next/link'
import type { PaymentMethod } from '@betv/shared'
import { useCheckout, type BrickFormData } from '@/lib/mp/use-checkout'
import { MockCheckout } from './mock-checkout'
import { PaymentPending, PaymentSuccess, PaymentRejected, PaymentAnalysis } from './payment-states'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

const BrickCheckout = dynamic(() => import('./brick-checkout'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-card" />,
})

export function CheckoutClient({ renew = false }: { renew?: boolean }) {
  const { mock, publicKey, name, loading, snapshot, paymentId, createPayment, reset } = useCheckout({ renew })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function pay(method: PaymentMethod, form: BrickFormData) {
    setSubmitting(true)
    setError('')
    try {
      await createPayment(method, form)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar o pagamento')
    } finally {
      setSubmitting(false)
    }
  }

  // Acompanhando um pagamento (recém-criado ou retomado por refresh / ?pid=).
  if (paymentId) {
    if (!snapshot) return <Skeleton className="h-64 w-full rounded-card" />
    if (snapshot.status === 'approved') return <PaymentSuccess name={name} renew={renew} />
    if (snapshot.status === 'rejected' || snapshot.status === 'cancelled') return <PaymentRejected onRetry={reset} />
    if (snapshot.status === 'in_process') return <PaymentAnalysis />
    return <PaymentPending snapshot={snapshot} mock={!!mock} />
  }

  if (loading || mock === null) return <Skeleton className="h-64 w-full rounded-card" />

  // Sem cadastro/sessão não há ator para criar o pagamento — guia o usuário ao cadastro.
  if (!renew && !name) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-text-secondary">Comece criando seu acesso para liberar o pagamento.</p>
        <Link href="/cadastro" className="w-full max-w-xs">
          <Button fullWidth>Ir para o cadastro</Button>
        </Link>
      </div>
    )
  }

  if (mock) return <MockCheckout onPay={pay} submitting={submitting} error={error} />

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}
      <BrickCheckout publicKey={publicKey || ''} onPay={pay} onError={setError} />
    </div>
  )
}
