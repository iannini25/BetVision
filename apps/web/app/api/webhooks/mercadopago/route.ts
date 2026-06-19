import { NextResponse } from 'next/server'
import { processWebhook } from '@/services/payment.service'
import { applyAuthorizedPayment, applyPreapprovalStatus } from '@/services/subscription.service'
import { getMercadoPagoClient, isMockMP, mockPaymentsAllowed } from '@betv/shared/mercadopago/client'
import { verifyMpSignature, parseMpSignatureHeader } from '@betv/shared/mp-signature'

// Aviso de config perigosa: chave real + flag de mock ligada (o mock já é inacessível via isMockMP,
// mas a flag não deveria estar ligada em produção real).
if (process.env.MP_ACCESS_TOKEN && process.env.ALLOW_MOCK_PAYMENTS === 'true') {
  console.warn('[SEGURANÇA] ALLOW_MOCK_PAYMENTS=true com MP_ACCESS_TOKEN presente — remova a flag em produção.')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: string
      data?: { id?: string | number }
      // mock helpers
      paymentId?: string
      status?: string
      preapprovalId?: string
      paymentStatus?: string
      preapprovalStatus?: string
    }

    // Mock (sem chave): simula avulso E recorrente. Nunca exposto por engano: exige fora-de-produção
    // OU opt-in explícito (ALLOW_MOCK_PAYMENTS); em produção com chave real este branch é inacessível.
    if (isMockMP()) {
      if (!mockPaymentsAllowed()) return NextResponse.json({ error: 'Indisponível' }, { status: 404 })
      if (body.paymentId) {
        await processWebhook(String(body.paymentId), String(body.status || 'approved'))
      } else if (body.preapprovalId && body.preapprovalStatus) {
        await applyPreapprovalStatus(String(body.preapprovalId), String(body.preapprovalStatus))
      } else if (body.preapprovalId) {
        await applyAuthorizedPayment(`mock-ap-${body.preapprovalId}-${body.paymentStatus || 'approved'}`, String(body.preapprovalId), String(body.paymentStatus || 'approved'), null)
      }
      return NextResponse.json({ ok: true })
    }

    // Real: nunca confiar no corpo. Valida assinatura (fail-closed), busca o status autoritativo no MP.
    const dataId = body.data?.id
    if (!dataId) return NextResponse.json({ ok: true }) // outros tópicos: ignora silenciosamente

    const secret = process.env.MP_WEBHOOK_SECRET
    if (!secret) {
      console.error('MP_WEBHOOK_SECRET ausente em modo real — webhook rejeitado')
      return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
    }
    const parts = parseMpSignatureHeader(request.headers.get('x-signature'))
    const requestId = request.headers.get('x-request-id') || ''
    const ok = parts && verifyMpSignature(secret, { dataId: String(dataId).toLowerCase(), requestId, ts: parts.ts, v1: parts.v1 })
    if (!ok) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })

    const mp = getMercadoPagoClient()

    // Assinatura: status do acordo (cancelado/pausado direto no MP).
    if (body.type === 'subscription_preapproval') {
      const pre = await mp.getPreapproval(String(dataId))
      await applyPreapprovalStatus(pre.id, pre.status)
      return NextResponse.json({ ok: true })
    }

    // Assinatura: cada cobrança recorrente gerada.
    if (body.type === 'subscription_authorized_payment') {
      const ap = await mp.getAuthorizedPayment(String(dataId))
      if (!ap.preapprovalId) return NextResponse.json({ error: 'preapproval_id ausente' }, { status: 422 })
      await applyAuthorizedPayment(ap.id, ap.preapprovalId, ap.paymentStatus || 'rejected', ap.debitDate ?? null, ap.amount)
      return NextResponse.json({ ok: true })
    }

    // Avulso (payment): resolve a linha local por external_reference.
    const mpPayment = await mp.getPayment(String(dataId))
    if (!mpPayment.externalReference) {
      return NextResponse.json({ error: 'external_reference ausente' }, { status: 422 })
    }
    await processWebhook(mpPayment.externalReference, mpPayment.status, {
      statusDetail: mpPayment.statusDetail,
      paidAt: mpPayment.approvedAt ? new Date(mpPayment.approvedAt) : undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
