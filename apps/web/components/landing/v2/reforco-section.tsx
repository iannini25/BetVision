'use client'

import { useEyeAnchor } from './use-eye-anchor'
import { useRevealOnScroll } from './use-reveal-on-scroll'
import { EditorialWord, GradientWord } from './highlight'
import styles from './landing.module.css'

export function ReforcoSection() {
  const ref = useRevealOnScroll<HTMLElement>({ y: 24, stagger: 0.14, start: 'top 72%', variant: 'blur-in' })
  // The orb drifts through, dim — a quiet beat between the demo and the offer.
  const anchor = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 0.2, radiusFactor: 0.4 })

  return (
    <section
      ref={ref}
      id="reforco"
      className={`relative mx-auto flex min-h-[62vh] max-w-[1000px] flex-col items-center justify-center gap-5 px-5 py-24 text-center sm:px-8 ${styles.atmos} ${styles.atmosAmber}`}
    >
      <div ref={anchor} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2" />
      <h2 data-reveal className={`${styles.displayTitle} ${styles.displaySheen} max-w-[20ch] text-[clamp(2.2rem,5vw,4rem)]`}>
        Não é <EditorialWord>mágica</EditorialWord>. É <GradientWord>estatística</GradientWord>.
      </h2>
      <p data-reveal className="max-w-[44ch] text-[clamp(1.05rem,1.7vw,1.4rem)] leading-snug text-text-mid">
        Aposte com inteligência. Ou nem aposte, mas entenda o jogo.
      </p>
    </section>
  )
}
