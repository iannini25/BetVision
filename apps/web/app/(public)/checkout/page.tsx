import type { Metadata } from 'next'
import { CheckoutShell } from '@/components/checkout/checkout-shell'

export const metadata: Metadata = {
  title: 'Checkout · Passe da Copa · BetV',
  description: 'Garanta seu Passe da Copa por R$ 14,90. PIX, cartão ou boleto — acesso liberado na aprovação.',
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-bg-deep px-5 py-8 text-text-primary sm:px-8">
      <CheckoutShell />
    </main>
  )
}
