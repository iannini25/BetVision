import { NextResponse } from 'next/server'
import { processWebhook } from '@/services/payment.service'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const webhookSecret = process.env.MP_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('x-signature')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      // In production: validate HMAC signature here
    }

    if (body.type === 'payment' && body.data?.id) {
      const status = body.action === 'payment.updated' ? 'approved' : body.data.status
      await processWebhook(String(body.data.id), status || 'approved')
    }

    // Mock mode: accept any payload shape
    if (!process.env.MP_ACCESS_TOKEN && body.paymentId) {
      await processWebhook(body.paymentId, body.status || 'approved')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
