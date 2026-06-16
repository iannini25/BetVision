'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaymentMethod } from '@betv/shared'
import { useRealtime } from '@/hooks/use-realtime'

/** Mesma forma do onSubmit do Payment Brick (o mock-checkout produz idêntico). */
export type BrickFormData = {
  token?: string
  payment_method_id?: string
  issuer_id?: string
  installments?: number
  payer?: { email?: string; identification?: { type?: string; number?: string } }
}

export type PaymentSnapshot = {
  paymentId: string
  status: string
  method: string
  subToken?: string
  pix?: { qrCodeBase64: string | null; copiaECola: string | null }
  boletoUrl?: string | null
}

const TERMINAL = new Set(['approved', 'rejected', 'cancelled'])
const PID_KEY = 'betv-pid'

/**
 * Estado do checkout: config (mock × Brick), criação do pagamento, e o acompanhamento do status
 * por POLLING (fonte da verdade, sobrevive a refresh) acelerado pelo realtime da própria linha.
 * `renew` troca o endpoint para a renovação autenticada.
 */
export function useCheckout(opts: { renew?: boolean } = {}) {
  const queryClient = useQueryClient()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const endpoint = opts.renew ? '/api/conta/renovar' : '/api/mp/criar-pagamento'

  // Resume: ?pid= (link) ou sessionStorage (refresh no meio do pending).
  useEffect(() => {
    if (paymentId || typeof window === 'undefined') return
    const fromUrl = new URL(window.location.href).searchParams.get('pid')
    const stored = fromUrl || sessionStorage.getItem(PID_KEY)
    if (stored) setPaymentId(stored)
  }, [paymentId])

  const config = useQuery({
    queryKey: ['mp-config'],
    queryFn: async () => {
      const r = await fetch('/api/mp/config')
      return (await r.json()) as { mock: boolean; publicKey: string | null }
    },
  })

  const me = useQuery({
    queryKey: ['mp-me'],
    queryFn: async () => {
      const r = await fetch('/api/mp/me')
      if (!r.ok) return { name: '' }
      return (await r.json()) as { name: string }
    },
  })

  const status = useQuery({
    queryKey: ['payment', paymentId],
    enabled: !!paymentId,
    queryFn: async () => {
      const r = await fetch(`/api/mp/pagamento/${paymentId}`)
      if (!r.ok) throw new Error('Pagamento não encontrado')
      return (await r.json()) as PaymentSnapshot
    },
    refetchInterval: (query) => (query.state.data && TERMINAL.has(query.state.data.status) ? false : 3000),
  })

  // Acelerador realtime: ao receber payments_update da própria linha, refaz o fetch do status.
  const onMessage = useCallback(
    (msg: { type: string; id?: number | string }) => {
      if (msg.type === 'payments_update' && paymentId && String(msg.id) === paymentId) {
        queryClient.invalidateQueries({ queryKey: ['payment', paymentId] })
      }
    },
    [paymentId, queryClient]
  )
  const subToken = status.data?.subToken
  useRealtime(
    useMemo(
      () => ({ paymentId: paymentId ?? undefined, paymentSubToken: subToken, onMessage }),
      [paymentId, subToken, onMessage]
    )
  )

  const createPayment = useCallback(
    async (method: PaymentMethod, form: BrickFormData): Promise<PaymentSnapshot> => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, brickFormData: form }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao criar o pagamento')

      const snapshot: PaymentSnapshot = {
        paymentId: data.paymentId,
        status: data.status,
        method,
        subToken: data.subToken,
        pix: data.pix,
        boletoUrl: data.boletoUrl,
      }
      queryClient.setQueryData(['payment', data.paymentId], snapshot) // sem flash de loading
      sessionStorage.setItem(PID_KEY, data.paymentId)
      setPaymentId(data.paymentId)
      return snapshot
    },
    [endpoint, queryClient]
  )

  const reset = useCallback(() => {
    sessionStorage.removeItem(PID_KEY)
    if (typeof window !== 'undefined') {
      // Também remove ?pid= da URL, senão o resume re-semeia o id terminal e prende a tela.
      const u = new URL(window.location.href)
      if (u.searchParams.has('pid')) {
        u.searchParams.delete('pid')
        window.history.replaceState({}, '', u)
      }
    }
    if (paymentId) queryClient.removeQueries({ queryKey: ['payment', paymentId] })
    setPaymentId(null)
  }, [paymentId, queryClient])

  return {
    mock: config.data?.mock ?? null,
    publicKey: config.data?.publicKey ?? null,
    name: me.data?.name ?? '',
    loading: config.isLoading, // o formulário não depende do nome; só o config gate
    meReady: !me.isLoading,
    snapshot: status.data ?? null,
    paymentId,
    createPayment,
    reset,
  }
}
