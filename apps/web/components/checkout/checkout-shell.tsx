'use client'

import { useState } from 'react'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { CheckoutClient } from './checkout-client'

/**
 * Casca do checkout: mostra o cabeçalho de coleta ("Falta um passo…") e o resumo do plano
 * SÓ durante a escolha do método. Ao entrar num estado terminal (pagamento criado, teste
 * iniciado, sucesso, recusa, análise), esconde os dois — o estado terminal fala por si e o
 * cabeçalho otimista contradiria "Pagamento não aprovado/confirmado".
 */
export function CheckoutShell() {
  const [postFunnel, setPostFunnel] = useState(false)

  return (
    <div className={postFunnel ? 'mx-auto mt-12 max-w-[520px]' : 'mx-auto mt-12 grid max-w-[760px] grid-cols-1 gap-6 md:grid-cols-[1fr_300px]'}>
      <section className="rounded-card border border-border-subtle bg-white/[0.025] p-7">
        {!postFunnel && (
          <>
            <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">Passe da Copa · plano único</span>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">Falta um passo para começar.</h1>
            <p className="mt-3 mb-6 max-w-[48ch] text-[15px] leading-relaxed text-text-secondary">
              Escolha como pagar. O acesso é liberado assim que o pagamento for aprovado.
            </p>
          </>
        )}
        <CheckoutClient onPhaseChange={setPostFunnel} />
      </section>

      {!postFunnel && (
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
      )}
    </div>
  )
}
