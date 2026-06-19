'use client'

import { useId, useState } from 'react'
import { ArrowDown2 } from 'iconsax-reactjs'
import { useEyeAnchor } from './use-eye-anchor'
import { useRevealOnScroll } from './use-reveal-on-scroll'
import styles from './landing.module.css'

const FAQ = [
  { q: 'O BetV é uma casa de aposta?', a: 'Não. É um terminal de inteligência estatística. Você não aposta aqui: você entende o jogo antes de decidir qualquer coisa.' },
  { q: 'Vocês prometem lucro?', a: 'Nunca. Probabilidade não é certeza, e quem promete lucro está mentindo. Nossa taxa de acerto é pública, com os erros incluídos.' },
  { q: 'Como funciona o pagamento?', a: 'PIX, R$ 14,90, uma única vez. O passe vale 45 dias, da abertura à final. Sem assinatura, sem renovação automática.' },
  { q: 'De onde vêm os dados?', a: '32 fontes monitoradas 24/7: estatísticas oficiais, odds de todas as casas e notícias de escalação, lesão e suspensão.' },
  { q: 'Preciso entender de estatística?', a: 'Não. O agente traduz tudo em linguagem simples, e o chat responde qualquer dúvida na hora.' },
  { q: 'Funciona no celular?', a: 'Sim. Desktop completo e mobile, com a mesma inteligência em tempo real.' },
]

function FaqItem({ q, a, open, onToggle, divider }: { q: string; a: string; open: boolean; onToggle: () => void; divider: boolean }) {
  const uid = useId().replace(/:/g, '')
  return (
    <div data-reveal className={divider ? 'border-t border-white/5' : ''}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`faq-${uid}`}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[clamp(1rem,1.5vw,1.2rem)] font-semibold text-text-hi">{q}</span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'rotate-180 bg-brand-soft/[0.1]' : 'bg-brand-soft/[0.05]'}`}>
          <ArrowDown2 size={16} color="currentColor" variant="Linear" className="text-brand-soft" />
        </span>
      </button>
      <div id={`faq-${uid}`} role="region" className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="max-w-[68ch] pb-5 text-[15px] leading-relaxed text-text-mid">{a}</p>
        </div>
      </div>
    </div>
  )
}

export function FaqSection() {
  const ref = useRevealOnScroll<HTMLElement>({ stagger: 0.08, duration: 0.6, start: 'top 72%', variant: 'clip-wipe' })
  const [open, setOpen] = useState(0) // "casa?" answer visible by default — trust up front
  const anchor = useEyeAnchor<HTMLDivElement>({ morph: 0, intensity: 0.12, radiusFactor: 0.4 })

  return (
    <section ref={ref} id="faq" className={`relative mx-auto flex min-h-screen max-w-[820px] flex-col justify-center gap-10 px-5 py-24 sm:px-8 ${styles.atmos} ${styles.atmosCalm}`}>
      <div ref={anchor} aria-hidden className="pointer-events-none absolute left-1/2 top-1/4 h-56 w-56 -translate-x-1/2" />
      <h2 data-reveal className={`${styles.displayTitle} ${styles.displaySheen} text-[clamp(2rem,4.6vw,3.4rem)]`}>
        Perguntas diretas.
      </h2>
      <div data-reveal className={`${styles.glassPanel} rounded-card px-6 sm:px-8`}>
        {FAQ.map((item, i) => (
          <FaqItem
            key={item.q}
            q={item.q}
            a={item.a}
            open={open === i}
            onToggle={() => setOpen(open === i ? -1 : i)}
            divider={i > 0}
          />
        ))}
      </div>
    </section>
  )
}
