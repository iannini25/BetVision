'use client'

import { People, Activity, Timer1 } from 'iconsax-reactjs'
import { useEyeAnchor } from './use-eye-anchor'
import { useRevealOnScroll } from './use-reveal-on-scroll'
import { EditorialWord, GradientWord } from './highlight'
import { StatCountUp } from './stat-countup'
import styles from './landing.module.css'

export function ProblemaSection() {
  const ref = useRevealOnScroll<HTMLElement>({ stagger: 0.1, start: 'top 70%', variant: 'scale-in', from: 'center' })
  // PATTERN (locked): the orb reinforces the section's line. Here it recedes behind the
  // confronting question and sweeps horizontally — the eye that "already calculated" now
  // stares back at the reader. No morph; dim; scanning drift.
  const eyeAnchor = useEyeAnchor<HTMLSpanElement>({ morph: 0, intensity: 0.5, radiusFactor: 0.2, scan: true })

  return (
    <section
      ref={ref}
      id="problema"
      className={`relative mx-auto flex min-h-screen max-w-[1100px] flex-col items-center justify-center gap-10 px-5 py-24 text-center sm:px-8 ${styles.atmos}`}
    >
      <div className="relative flex flex-col items-center gap-5">
        {/* the orb parks behind the question and sweeps — "the eye stares back" */}
        <span ref={eyeAnchor} aria-hidden className="pointer-events-none absolute left-1/2 top-[42%] h-44 w-[120%] -translate-x-1/2 -translate-y-1/2" />
        <h2 data-reveal className={`${styles.displayTitle} ${styles.displaySheen} relative max-w-[20ch] text-[clamp(2rem,5.2vw,3.8rem)]`}>
          A casa nunca aposta no <EditorialWord>escuro</EditorialWord>. Por que você apostaria?
        </h2>
        <p data-reveal className="max-w-[44ch] text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-text-mid">
          Ela calcula a probabilidade real de cada jogo e embute a margem. Você merece o mesmo número.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCountUp value={25} suffix=" mi" label="de brasileiros já apostam" Icon={People} />
        <StatCountUp value={80} prefix="+" suffix="%" label="das apostas são em futebol" Icon={Activity} />
        <StatCountUp value={44} suffix="%" label="gastam até 1 h analisando antes de decidir" Icon={Timer1} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p data-reveal className="max-w-[40ch] text-[clamp(1.05rem,1.7vw,1.4rem)] font-medium leading-snug text-text-hi">
          O BetV faz essa análise por você. Em <GradientWord>tempo real</GradientWord>. Nos 104 jogos da Copa.
        </p>
        <p data-reveal className="font-mono text-[11px] text-text-low">
          Dados de mercado (estimativas). O BetV é informativo, não recomendação.
        </p>
      </div>
    </section>
  )
}
