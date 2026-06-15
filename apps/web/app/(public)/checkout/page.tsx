import type { Metadata } from 'next'
import Link from 'next/link'
import { BetvLogo } from '@/components/landing/v2/betv-logo'
import { Disclaimer18 } from '@/components/ui/disclaimer'

export const metadata: Metadata = {
  title: 'Checkout · Passe da Copa · BetV',
  description: 'Garanta seu Passe da Copa por R$ 14,90 via PIX. O pagamento cria sua conta automaticamente.',
}

// TODO(fase futura): /checkout é um STUB de UI. Falta a integração real de pagamento
// (Mercado Pago PIX dinâmico + criação automática de conta no pagamento + envio do login
// por e-mail). Não há cobrança aqui ainda. Página é pública de propósito: o pagamento
// cria a conta, então não exige login antes. Não promover como checkout final.
export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-bg-deep px-5 py-8 text-text-hi sm:px-8">
      <header className="mx-auto flex max-w-[760px] items-center justify-between">
        <Link href="/landing" className="flex items-center gap-2.5" aria-label="Voltar para a BetV">
          <BetvLogo height={26} priority />
          <span className="font-display text-lg font-extrabold tracking-tight">BetV</span>
        </Link>
        <Link href="/login" className="text-sm text-text-mid underline-offset-4 hover:text-text-hi hover:underline">
          Já tem conta? Entrar
        </Link>
      </header>

      <div className="mx-auto mt-12 grid max-w-[760px] grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        <section className="rounded-card border border-line bg-white/[0.025] p-7">
          <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-low">Passe da Copa · plano único</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Falta um PIX para começar.</h1>
          <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-text-mid">
            Pague com PIX e o acesso é liberado na hora. <strong className="text-text-hi">O pagamento cria sua conta
            automaticamente</strong>, você recebe o login por e-mail. Sem cadastro antes, sem fricção.
          </p>

          <div className="mt-7 grid place-items-center gap-3 rounded-input border border-dashed border-line-strong bg-bg-card/40 p-8 text-center">
            <div className="grid h-36 w-36 place-items-center rounded-input border border-line bg-bg-card font-mono text-[11px] text-text-low">
              QR PIX
            </div>
            <p className="font-mono text-[11px] text-text-low">Pagamento via Mercado Pago · em construção (stub).</p>
          </div>
        </section>

        <aside className="flex h-fit flex-col gap-4 rounded-card border border-line bg-white/[0.025] p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-text-mid">Passe da Copa</span>
            <span className="font-display text-2xl font-extrabold">R$ 14,90</span>
          </div>
          <p className="font-mono text-[12px] text-text-mid">pagamento único · PIX · 45 dias · a Copa inteira</p>
          <div className="h-px bg-line" />
          <span className="rounded border border-line px-2 py-0.5 text-center font-mono text-[10px] font-bold text-text-mid">18+</span>
          <Disclaimer18 />
        </aside>
      </div>
    </main>
  )
}
