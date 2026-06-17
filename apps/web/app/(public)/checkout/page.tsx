import type { Metadata } from 'next'
import Link from 'next/link'
import { BetvLogo } from '@/components/landing/v2/betv-logo'
import { CheckoutShell } from '@/components/checkout/checkout-shell'

export const metadata: Metadata = {
  title: 'Checkout · Passe da Copa · BetV',
  description: 'Garanta seu Passe da Copa por R$ 14,90. PIX, cartão ou boleto — acesso liberado na aprovação.',
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-bg-deep px-5 py-8 text-text-primary sm:px-8">
      <header className="mx-auto flex max-w-[760px] items-center justify-between">
        <Link href="/landing" className="flex items-center gap-2.5" aria-label="Voltar para a BetV">
          <BetvLogo height={26} priority />
          <span className="font-display text-lg font-extrabold tracking-tight">BetV</span>
        </Link>
        <Link href="/login" className="text-sm text-text-muted underline-offset-4 hover:text-text-primary hover:underline">
          Já tem conta? Entrar
        </Link>
      </header>

      <CheckoutShell />
    </main>
  )
}
