'use client'

import { useRef } from 'react'
import { ArrowRight } from 'iconsax-reactjs'
import { gsap } from './gsap-init'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { EyePortal } from './eye-portal'
import { PreviewPredicao } from './preview-predicao'
import { MagneticButton } from './magnetic-button'
import { PartnerLogosMarquee } from './partner-logos-marquee'
import { EditorialWord } from './highlight'
import type { PartnerLogo } from '@/lib/partner-logos'
import styles from './landing.module.css'

// Reference pattern (creativly / AB): a short grotesk SETUP line, then a DOMINANT full
// italic-serif PAYOFF line — the brightest, largest element. Not one italic word inline.
const H1_SETUP = ['Chega', 'de', 'apostar']
const H1_PAYOFF = 'no escuro.'

export function Hero({ logos = [] }: { logos?: PartnerLogo[] }) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const words = ref.current?.querySelectorAll<HTMLElement>('[data-word]')
      const fades = ref.current?.querySelectorAll<HTMLElement>('[data-fade]')
      const rises = ref.current?.querySelectorAll<HTMLElement>('[data-rise]')
      if (reduced) {
        gsap.set([...(words ?? []), ...(fades ?? []), ...(rises ?? [])], { opacity: 1, y: 0, filter: 'blur(0px)' })
        return
      }
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-eyebrow]', { y: 16, opacity: 0, duration: 0.6 })
        .from(words ?? [], { yPercent: 115, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, '-=0.2')
        .from(fades ?? [], { y: 20, opacity: 0, filter: 'blur(8px)', duration: 0.7, stagger: 0.12 }, '-=0.5')
        .from(rises ?? [], { y: 40, opacity: 0, duration: 0.9, stagger: 0.15, ease: 'power2.out' }, '-=0.3')
    },
    { scope: ref, dependencies: [reduced] }
  )

  return (
    <section ref={ref} className="relative px-5 pt-28 sm:px-8">
      {/* No per-section background — the page bg is one fixed layer (ReactiveBackground). */}

      {/* first screen: ONE focal point — the headline + primary CTA own the fold */}
      <div className="relative z-10 mx-auto flex min-h-[84svh] max-w-[1100px] flex-col items-center justify-center text-center">
        <div
          data-eyebrow
          className={`${styles.liveTag} mb-7 inline-flex items-center gap-3 rounded-pill px-4 py-1.5`}
        >
          {/* surgical green live signal — a broadcast level-meter, not a status LED */}
          <span className={styles.liveMeter} aria-hidden="true">
            <span className={styles.liveBar} />
            <span className={styles.liveBar} />
            <span className={styles.liveBar} />
          </span>

          {/* broadcast lower-third caption (wording unchanged) */}
          <span className={styles.liveCaption}>
            <span className={styles.liveEdition}>Copa 2026</span>
            <span className={styles.liveDivider} aria-hidden="true" />
            <span className={styles.liveKicker}>Inteligência ao vivo</span>
          </span>

          {/* a single brand-purple point of light travelling the bezel (not a border-beam) */}
          <span className={styles.liveOrbit} aria-hidden="true">
            <span className={styles.liveSpark} />
          </span>
        </div>

        <h1 className={`${styles.heroTitle} mx-auto text-[clamp(3.1rem,8.4vw,6.8rem)]`}>
          <span className="flex flex-wrap justify-center">
            {H1_SETUP.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.3em]">
                <span data-word className={`inline-block pr-[0.26em] ${styles.displaySheen}`}>
                  {w}
                </span>
              </span>
            ))}
          </span>
          <span className="-mt-[0.32em] flex justify-center leading-[1.08]">
            <span className="inline-block overflow-hidden align-bottom pb-[0.16em]">
              <span data-word className="inline-block">
                <EditorialWord>{H1_PAYOFF}</EditorialWord>
              </span>
            </span>
          </span>
        </h1>

        <p data-fade className="mx-auto mt-7 max-w-[46ch] text-[clamp(1rem,1.5vw,1.22rem)] leading-relaxed text-text-mid">
          A Copa inteira, calculada em tempo real. A probabilidade de cada lance, e o que a odd
          não te conta.
        </p>

        <div data-fade className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <MagneticButton
            href="/checkout"
            ariaLabel="Garantir meu passe"
            magnetic={false}
            className="!py-3.5 !pl-8 !pr-16 text-[15px]"
            trailingIcon={<ArrowRight size={18} color="currentColor" variant="Bold" />}
          >
            Garantir meu passe
          </MagneticButton>
          <MagneticButton href="#probabilidades" variant="ghost" magnetic={false} className="!py-4">
            Ver predições ao vivo
          </MagneticButton>
        </div>
      </div>

      {/* partner strip — sits between the headline and the live demo */}
      <PartnerLogosMarquee logos={logos} />

      {/* the eye (the logo, in particles) as protagonist + the live prediction dashboard */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1240px] items-center gap-8 lg:grid-cols-[1fr_1.08fr] lg:gap-14">
        <div data-rise className="relative mx-auto w-full max-w-[560px]">
          <EyePortal />
          <span className="absolute -top-1 right-3 inline-flex items-center gap-1.5 rounded-pill border border-brand-soft/40 bg-brand-soft/[0.14] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-hi shadow-[0_4px_16px_-6px_rgba(124,58,237,0.6)] backdrop-blur-sm">
            <span className={`h-1.5 w-1.5 rounded-full bg-accent-hi ${styles.dotGlow}`} />
            demonstração
          </span>
        </div>
        <div data-rise className="mx-auto w-full max-w-[680px]">
          <PreviewPredicao />
        </div>
      </div>

      {/* quiet trust line, below the fold — not competing with the hero focal point */}
      <p
        data-rise
        className="relative z-10 mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 pb-24 font-mono text-[11px] text-text-low"
      >
        <span className="text-text-mid">R$ 14,90</span>
        <span aria-hidden>·</span>
        <span>PIX</span>
        <span aria-hidden>·</span>
        <span>45 dias de acesso</span>
        <span aria-hidden>·</span>
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-bold text-text-mid">18+</span>
      </p>
    </section>
  )
}
