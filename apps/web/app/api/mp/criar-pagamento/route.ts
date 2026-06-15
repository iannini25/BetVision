import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createPixPayment } from '@/services/payment.service'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    const payment = await createPixPayment(session.userId)
    return NextResponse.json({
      paymentId: payment.id,
      qrCode: payment.pixQrCode,
      copiaECola: payment.pixCopiaECola,
      amount: payment.amount,
    })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
