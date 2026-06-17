'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { animate, spring } from 'animejs'
import { TickCircle, CloseCircle, InfoCircle, Copy, Wallet2, Refresh } from 'iconsax-reactjs'
import { SUBSCRIPTION_DAYS } from '@betv/shared'
import { Button } from '@/components/ui/button'
import { prefersReducedMotion } from '@/lib/motion'
import type { PaymentSnapshot } from '@/lib/mp/use-checkout'

const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

function useSpringIn(active: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!ref.current || !active || prefersReducedMotion()) return
    const anim = animate(ref.current, { scale: [0, 1], opacity: [0, 1], ease: spring({ duration: 600, bounce: 0.45 }) })
    return () => {
      anim.revert()
    }
  }, [active])
  return ref
}

export function PaymentPending({ snapshot, mock }: { snapshot: PaymentSnapshot; mock: boolean }) {
  const { method, pix, boletoUrl, paymentId } = snapshot
  const [simulating, setSimulating] = useState(false)

  async function simulateApproval() {
    setSimulating(true)
    // Em mock, o botão DEV chama o MESMO webhook que o MP chamaria; a tela atualiza sozinha
    // pelo polling/realtime (não por esta resposta).
    await fetch('/api/webhooks/mercadopago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, status: 'approved' }),
    }).catch(() => {})
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center" role="status" aria-live="polite">
      {method === 'pix' && pix?.qrCodeBase64 && (
        <>
          <h2 className="font-display text-xl font-bold">Pague com PIX para liberar o acesso</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code PIX"
            className="h-48 w-48 rounded-card border border-border-subtle bg-white p-2"
          />
          {pix.copiaECola && <CopyPix code={pix.copiaECola} />}
        </>
      )}

      {method === 'boleto' && (
        <>
          <h2 className="font-display text-xl font-bold">Boleto gerado</h2>
          {boletoUrl && (
            <a href={boletoUrl} target="_blank" rel="noopener noreferrer" className="text-brand-violet hover:underline">
              Abrir boleto
            </a>
          )}
          <p className="text-sm text-text-secondary">O acesso é liberado quando o boleto é compensado.</p>
        </>
      )}

      {(method === 'credit' || method === 'debit' || method === 'wallet') && (
        <>
          <Refresh size={32} variant="Linear" color="currentColor" className="animate-spin text-brand-violet" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold">Processando pagamento…</h2>
        </>
      )}

      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Wallet2 size={16} variant="Linear" color="currentColor" aria-hidden="true" />
        Aguardando confirmação…
      </p>

      {mock && (
        <button
          onClick={simulateApproval}
          disabled={simulating}
          className="mt-2 rounded-button border border-dashed border-brand-violet/60 px-4 py-2 text-xs font-bold tracking-wider text-brand-violet hover:bg-brand-violet/5 disabled:opacity-60"
        >
          DEV · simular aprovação
        </button>
      )}
    </div>
  )
}

function CopyPix({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* contexto inseguro: o texto abaixo continua selecionável manualmente */
    }
  }
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <button
        onClick={copy}
        aria-label="Copiar código PIX copia e cola"
        className="inline-flex items-center justify-center gap-2 rounded-button border border-border-input px-4 py-2.5 text-sm text-text-primary hover:border-border-hover"
      >
        <Copy size={18} variant="Linear" color="currentColor" aria-hidden="true" />
        Copiar código PIX
      </button>
      <p className="break-all font-mono text-[10px] text-text-muted select-all">{code}</p>
      <span role="status" aria-live="polite" className="h-4 text-xs text-accent-green-text">
        {copied ? 'Código copiado' : ''}
      </span>
    </div>
  )
}

export function PaymentSuccess({ name, renew }: { name: string; renew: boolean }) {
  const markRef = useSpringIn(true)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    headingRef.current?.focus()
  }, [])

  const inicio = new Date()
  const fim = new Date(Date.now() + SUBSCRIPTION_DAYS * 86_400_000)
  const ola = name ? `, ${name}` : ''

  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div ref={markRef} className="text-accent-green-text">
        <TickCircle size={56} variant="Bold" color="currentColor" aria-hidden="true" />
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-extrabold outline-none">
        Pagamento confirmado{ola}!
      </h2>
      <p className="text-text-secondary">Bem-vindo ao BetV. Seu Passe da Copa está ativo.</p>

      <div className="rounded-card border border-border-subtle bg-bg-card/40 p-4 text-sm text-text-secondary">
        <p>
          <strong className="text-text-primary">{SUBSCRIPTION_DAYS} dias</strong> de acesso
        </p>
        <p className="text-text-muted">
          {renew ? '+45 dias somados ao seu passe' : `${fmtDate(inicio)} até ${fmtDate(fim)}`}
        </p>
      </div>

      {renew ? (
        <Link href="/hoje" className="w-full max-w-xs">
          <Button fullWidth>Voltar para o BetV</Button>
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-text-secondary">Enviamos um e-mail para você criar sua senha e finalizar a conta.</p>
          <Link href="/login" className="text-brand-violet hover:underline text-sm">
            Já criei minha senha — entrar
          </Link>
        </div>
      )}
    </div>
  )
}

export function TrialActive({
  name,
  trialEndsAt,
  setPasswordToken,
}: {
  name: string
  trialEndsAt: Date
  setPasswordToken?: string
}) {
  const markRef = useSpringIn(true)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    headingRef.current?.focus()
  }, [])
  const ola = name ? `, ${name}` : ''

  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div ref={markRef} className="text-accent-green-text">
        <TickCircle size={56} variant="Bold" color="currentColor" aria-hidden="true" />
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-extrabold outline-none">
        Seu teste começou{ola}!
      </h2>
      <p className="text-text-secondary">
        Aproveite o BetV grátis até <strong className="text-text-primary">{fmtDate(trialEndsAt)}</strong>. Sem cobrança até lá —
        e você pode cancelar quando quiser, em 1 clique, na sua conta.
      </p>

      {setPasswordToken ? (
        <Link href={`/criar-senha/${setPasswordToken}`} className="w-full max-w-xs">
          <Button fullWidth>Criar minha senha e entrar</Button>
        </Link>
      ) : (
        <Link href="/hoje" className="w-full max-w-xs">
          <Button fullWidth>Começar a usar</Button>
        </Link>
      )}
    </div>
  )
}

export function PaymentRejected({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center" role="alert">
      <div className="text-accent-red">
        <CloseCircle size={48} variant="Bold" color="currentColor" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-bold">Pagamento não aprovado</h2>
      <p className="text-text-secondary">O pagamento foi recusado. Confira os dados e tente novamente.</p>
      <Button onClick={onRetry} variant="secondary">
        Tentar de novo
      </Button>
    </div>
  )
}

export function PaymentAnalysis() {
  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div className="text-brand-violet">
        <InfoCircle size={48} variant="Bold" color="currentColor" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-bold">Pagamento em análise</h2>
      <p className="text-text-secondary">Assim que for aprovado, seu acesso é liberado automaticamente.</p>
    </div>
  )
}
