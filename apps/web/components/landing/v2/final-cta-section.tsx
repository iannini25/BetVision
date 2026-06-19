'use client'

import { useEyeAnchor } from './use-eye-anchor'
import { useRevealOnScroll } from './use-reveal-on-scroll'
import { useAnimeTextReveal } from './use-anime-text-reveal'
import { MagneticButton } from './magnetic-button'
import { GradientWord } from './highlight'
import { BetvLogo } from './betv-logo'
import styles from './landing.module.css'

export function FinalCtaSection() {
  const ref = useRevealOnScroll<HTMLElement>({ stagger: 0.14, duration: 0.85, start: 'top 70%', variant: 'scale-in', from: 'center' })
  // The orb comes home: the eye reforms and watches the Cup. Bright, centered above the CTA.
  const eyeAnchor = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 1, radiusFactor: 0.4 })
  // The climax line ASSEMBLES char by char as the eye reforms above it (lands just after).
  const climax = useAnimeTextReveal<HTMLSpanElement>({ unit: 'chars', step: 22, enter: 'bottom-=60 top', delay: 120 })

  return (
    <>
      <section ref={ref} id="fechar" className={`relative flex min-h-[90vh] flex-col items-center justify-center gap-7 px-5 py-24 text-center sm:px-8 ${styles.atmos}`}>
        <div ref={eyeAnchor} aria-hidden className="pointer-events-none mb-2 h-44 w-44 sm:h-56 sm:w-56" />
        {/* sheen dropped here so the split-char clip never renders transparent; the climax span
            assembles via anime.js, the gradient clause reveals via GSAP — disjoint targets. */}
        <h2 className={`${styles.displayTitle} max-w-[18ch] text-[clamp(2.2rem,5.5vw,4.4rem)]`}>
          <span ref={climax} className="inline-block">O olho está aberto.</span>{' '}
          <span data-reveal className="inline-block">
            A Copa, <GradientWord>calculada</GradientWord>.
          </span>
        </h2>
        <p data-reveal className="max-w-[44ch] text-[clamp(1rem,1.6vw,1.3rem)] leading-relaxed text-text-mid">
          45 dias. Todos os jogos. A probabilidade real de cada lance.
        </p>
        <div data-reveal>
          <MagneticButton href="/checkout" ariaLabel="Garantir meu passe" className="!px-9 !py-4 text-base">
            Garantir meu passe
          </MagneticButton>
        </div>
        <p data-reveal className="font-mono text-[12px] text-text-low">R$ 14,90 · PIX · 45 dias · 18+ · não é recomendação</p>
      </section>

      <footer className="relative z-10 border-t border-white/[0.04] px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <BetvLogo height={22} />
              <span className="font-display text-base font-extrabold tracking-tight text-text-hi">BetV</span>
              <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-mid">18+</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-mid">
              <a href="/termos" className="transition-colors hover:text-text-hi">Termos</a>
              <a href="/privacidade" className="transition-colors hover:text-text-hi">Privacidade (LGPD)</a>
              <a href="/contato" className="transition-colors hover:text-text-hi">Contato</a>
            </nav>
          </div>

          <p className="max-w-[80ch] font-mono text-[11px] leading-relaxed text-text-low">
            Conteúdo informativo e estatístico. Não é casa de aposta nem recomendação financeira. Aposte com
            responsabilidade. Proibido para menores de 18 anos. Jogo pode causar dependência. Se precisar de ajuda,
            procure apoio especializado.
          </p>

          <div className="flex flex-col justify-between gap-2 border-t border-line pt-6 text-[11px] text-text-low sm:flex-row">
            <span>CNPJ 00.000.000/0001-00 · BetV (placeholder)</span>
            <span>Feito no Brasil para a Copa de 2026.</span>
          </div>
        </div>
      </footer>
    </>
  )
}
