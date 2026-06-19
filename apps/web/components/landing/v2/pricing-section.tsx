'use client'

import { TickCircle, ArrowRight } from 'iconsax-reactjs'
import { useCountUp } from '@/hooks/use-count-up'
import { useCountdown } from '@/hooks/use-countdown'
import { useEyeAnchor } from './use-eye-anchor'
import { useRevealOnScroll } from './use-reveal-on-scroll'
import { MagneticButton } from './magnetic-button'
import styles from './landing.module.css'

const INCLUDES = [
  'Probabilidades ao vivo de todos os 104 jogos',
  'Radar de Valor e comparação de odds entre casas',
  'Chat com o agente de IA, com fontes',
  'Perfis de árbitros, seleções e jogadores',
  'Performance do modelo aberta ao público',
  'Acesso no celular e no computador',
]

function Countdown() {
  const { days, hours, minutes, seconds, isExpired } = useCountdown()
  if (isExpired) {
    return <p className="font-mono text-[13px] text-text-mid">A Copa terminou. Até a próxima.</p>
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="font-mono text-[12px] text-text-mid">
        A Copa já começou. Faltam <span className="font-bold text-text-hi">{days}</span> dias para a final.
      </p>
      <div className="flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums text-text-hi">
        {[
          [days, 'd'],
          [hours, 'h'],
          [minutes, 'm'],
          [seconds, 's'],
        ].map(([v, u]) => (
          <span key={u as string} className="rounded-md border border-line bg-bg-card-2/60 px-2 py-1">
            {pad(v as number)}
            <span className="text-text-low">{u as string}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function PricingSection() {
  // Price is the hero here; a soft scale-in gives the card presence as it settles in.
  const ref = useRevealOnScroll<HTMLElement>({ stagger: 0.08, start: 'top 70%', variant: 'scale-in' })
  // Keep the orb dim and high, away from the CTA — no competition.
  const anchor = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 0.1, radiusFactor: 0.45 })
  // The conversion number earns the eye by counting up when it scrolls into view.
  const priceRef = useCountUp<HTMLSpanElement>(14.9, { prefix: 'R$ ', decimals: 2, duration: 1100 })

  return (
    <section ref={ref} id="passe" className={`relative mx-auto flex min-h-screen max-w-[1180px] flex-col items-center justify-center gap-8 px-5 py-24 sm:px-8 ${styles.atmos} ${styles.atmosCalm}`}>
      <div ref={anchor} aria-hidden className="pointer-events-none absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2" />

      <div data-reveal className="flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-low">Passe da Copa · plano único</span>
      </div>

      <div data-reveal className={`relative w-full max-w-[640px] overflow-hidden rounded-card p-7 sm:p-10 ${styles.glassPanel} ${styles.glassPanelHover}`}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-2/15 blur-3xl" />

        <div data-reveal className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-end justify-center gap-1">
            <span
              ref={priceRef}
              className="font-display text-[clamp(3.4rem,9vw,5.5rem)] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-text-hi"
            >
              R$ 14,90
            </span>
          </div>
          <p className="font-mono text-[13px] text-text-mid">pagamento único via PIX · 45 dias · a Copa inteira</p>
        </div>

        <ul data-reveal className="mx-auto mt-8 grid max-w-[520px] grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {INCLUDES.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-text-secondary">
              <TickCircle size={18} color="currentColor" variant="Bold" className="mt-px shrink-0 text-accent-hi" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-[13px] text-text-mid">Sem assinatura. Sem renovação automática. Sem fidelidade.</p>

        <div className="mt-7 flex justify-center">
          <Countdown />
        </div>

        <div className="mt-7 flex justify-center">
          <MagneticButton href="/checkout" ariaLabel="Garantir meu passe" className="!px-9 !py-4 text-base">
            <ArrowRight size={18} color="currentColor" variant="Bold" /> Garantir meu passe
          </MagneticButton>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-white/5 pt-5 text-center">
          <span className="rounded border border-line px-2 py-0.5 font-mono text-[10px] font-bold text-text-mid">18+</span>
          <p className="max-w-[46ch] font-mono text-[11px] leading-relaxed text-text-low">
            Conteúdo informativo e estatístico. Não é casa de aposta nem recomendação financeira. Aposte com
            responsabilidade.
          </p>
        </div>
      </div>
    </section>
  )
}
