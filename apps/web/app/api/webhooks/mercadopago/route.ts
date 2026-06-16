import { NextResponse } from 'next/server'
import { processWebhook } from '@/services/payment.service'
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
      data?: { id?: string | number }
      paymentId?: string
      status?: string
    }

    // Mock (sem chave): aceita {paymentId, status} — ex.: botão "simular aprovação" do checkout.
    // Nunca exposto por engano: exige fora-de-produção OU opt-in explícito (ALLOW_MOCK_PAYMENTS).
    if (isMockMP()) {
      if (!mockPaymentsAllowed()) return NextResponse.json({ error: 'Indisponível' }, { status: 404 })
      if (body.paymentId) await processWebhook(String(body.paymentId), String(body.status || 'approved'))
      return NextResponse.json({ ok: true })
    }

    // Real: nunca confiar no corpo. Validar assinatura, buscar o status autoritativo no MP e
    // resolver a linha local por external_reference (à prova da corrida webhook-antes-do-create).
    const dataId = body.data?.id
    if (!dataId) return NextResponse.json({ ok: true }) // outros tópicos: ignora silenciosamente

    // Sem secret em modo real é configuração inválida — falha FECHADO (nunca processa sem assinatura).
    const secret = process.env.MP_WEBHOOK_SECRET
    if (!secret) {
      console.error('MP_WEBHOOK_SECRET ausente em modo real — webhook rejeitado')
      return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
    }
    const parts = parseMpSignatureHeader(request.headers.get('x-signature'))
    const requestId = request.headers.get('x-request-id') || ''
    const ok =
      parts &&
      verifyMpSignature(secret, { dataId: String(dataId).toLowerCase(), requestId, ts: parts.ts, v1: parts.v1 })
    if (!ok) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })

    const mpPayment = await getMercadoPagoClient().getPayment(String(dataId))
    if (!mpPayment.externalReference) {
      // Sem external_reference não há como casar com a linha local: peça retry ao MP.
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
