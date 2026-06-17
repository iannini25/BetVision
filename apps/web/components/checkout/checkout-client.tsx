'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PaymentMethod } from '@betv/shared'
import { useCheckout, type BrickFormData } from '@/lib/mp/use-checkout'
import { MethodChoice, CardPlanChoice } from './checkout-method'
import { PixPanel, CardNowPanel, TrialPanel } from './checkout-panels'
import { PaymentPending, PaymentSuccess, PaymentRejected, PaymentAnalysis, TrialActive } from './payment-states'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

type Step = 'method' | 'pix' | 'card-plan' | 'card-now' | 'trial'
type TrialResult = { trialEndsAt: string; setPasswordToken?: string }

/**
 * Funil de pagamento (sem regra de negócio — só orquestra):
 *   método (PIX × Cartão) → PIX | [cartão: pagar agora × 2 dias grátis] → form → estado.
 * `renew` (avulso vencido) pula o trial: cartão vai direto pra "pagar agora".
 */
export function CheckoutClient({ renew = false }: { renew?: boolean }) {
  const { mock, publicKey, name, loading, meReady, snapshot, paymentId, createPayment, reset } = useCheckout({ renew })
  const [step, setStep] = useState<Step>('method')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [trial, setTrial] = useState<TrialResult | null>(null)

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

  async function subscribe(cardToken: string) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/mp/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardToken, consent: { accepted: true } }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Não foi possível iniciar o teste')
        return
      }
      setTrial({ trialEndsAt: data.trialEndsAt, setPasswordToken: data.setPasswordToken })
    } catch {
      setError('Não foi possível iniciar o teste')
    } finally {
      setSubmitting(false)
    }
  }

  // --- estados finais ---
  if (trial) return <TrialActive name={name} trialEndsAt={new Date(trial.trialEndsAt)} setPasswordToken={trial.setPasswordToken} />

  if (paymentId) {
    if (!snapshot) return <Skeleton className="h-64 w-full rounded-card" />
    if (snapshot.status === 'approved') return <PaymentSuccess name={name} renew={renew} />
    if (snapshot.status === 'rejected' || snapshot.status === 'cancelled')
      return <PaymentRejected onRetry={() => { reset(); setStep('method') }} />
    if (snapshot.status === 'in_process') return <PaymentAnalysis />
    return <PaymentPending snapshot={snapshot} mock={!!mock} />
  }

  if (loading || mock === null) return <Skeleton className="h-64 w-full rounded-card" />

  // Sem cadastro/sessão não há ator — guia ao cadastro (só após /api/mp/me responder).
  if (!renew && meReady && !name) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-text-secondary">Comece criando seu acesso para liberar o pagamento.</p>
        <Link href="/cadastro" className="w-full max-w-xs">
          <Button fullWidth>Ir para o cadastro</Button>
        </Link>
      </div>
    )
  }

  // --- funil ---
  if (step === 'method') return <MethodChoice onPix={() => setStep('pix')} onCard={() => setStep(renew ? 'card-now' : 'card-plan')} />
  if (step === 'pix') return <PixPanel onPay={(f) => pay('pix', f)} submitting={submitting} error={error} onBack={() => setStep('method')} />
  if (step === 'card-plan') return <CardPlanChoice onNow={() => setStep('card-now')} onTrial={() => setStep('trial')} onBack={() => setStep('method')} />
  if (step === 'card-now')
    return (
      <CardNowPanel
        mock={!!mock}
        publicKey={publicKey || ''}
        onPay={(f) => pay('credit', f)}
        onError={setError}
        submitting={submitting}
        error={error}
        onBack={() => setStep(renew ? 'method' : 'card-plan')}
      />
    )
  if (step === 'trial') return <TrialPanel mock={!!mock} onSubscribe={subscribe} submitting={submitting} error={error} onBack={() => setStep('card-plan')} />
  return null
}
