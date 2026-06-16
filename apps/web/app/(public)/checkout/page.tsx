import type { Metadata } from 'next'
import Link from 'next/link'
import { BetvLogo } from '@/components/landing/v2/betv-logo'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { CheckoutClient } from '@/components/checkout/checkout-client'

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

      <div className="mx-auto mt-12 grid max-w-[760px] grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
        <section className="rounded-card border border-border-subtle bg-white/[0.025] p-7">
          <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">Passe da Copa · plano único</span>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">Falta um passo para começar.</h1>
          <p className="mt-3 mb-6 max-w-[48ch] text-[15px] leading-relaxed text-text-secondary">
            Escolha como pagar. O acesso é liberado assim que o pagamento for aprovado.
          </p>
          <CheckoutClient />
        </section>

        <aside className="flex h-fit flex-col gap-4 rounded-card border border-border-subtle bg-white/[0.025] p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-text-secondary">Passe da Copa</span>
            <span className="font-display text-2xl font-extrabold">R$ 14,90</span>
          </div>
          <p className="font-mono text-[12px] text-text-secondary">pagamento único · 45 dias · a Copa inteira</p>
          <p className="font-mono text-[11px] text-text-muted">preço fixo · sem taxa extra · PIX, cartão ou boleto</p>
          <div className="h-px bg-border-subtle" />
          <span className="self-start rounded border border-border-subtle px-2 py-0.5 font-mono text-[10px] font-bold text-text-muted">18+</span>
          <Disclaimer18 />
        </aside>
      </div>
    </main>
  )
}
