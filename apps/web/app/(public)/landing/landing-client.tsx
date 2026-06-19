'use client'

import dynamic from 'next/dynamic'
import localFont from 'next/font/local'
import { useSmoothScroll } from '@/components/landing/v2/use-smooth-scroll'
import { ReactiveBackground } from '@/components/landing/v2/reactive-background'
import { LandingNav } from '@/components/landing/v2/nav'

// 3D orb stage is client-only and heavy (three + R3F) — split it out of the initial bundle.
const LandingStage = dynamic(
  () => import('@/components/landing/v2/landing-stage').then((m) => m.LandingStage),
  { ssr: false }
)
// The hero silk texture also pulls in `three` — load it client-only too, so `three` stays out
// of the SSR + initial bundle (same reason as the eye stage above). Decorative, so no SSR loss.
const HeroSilk = dynamic(
  () => import('@/components/landing/v2/hero-silk').then((m) => m.HeroSilk),
  { ssr: false }
)
import { Hero } from '@/components/landing/v2/hero'
import { ProblemaSection } from '@/components/landing/v2/problema-section'
import { ChatSection } from '@/components/landing/v2/chat-section'
import { TransparenciaSection } from '@/components/landing/v2/transparencia-section'
import { BentoSection } from '@/components/landing/v2/bento-section'
import { ComoFuncionaSection } from '@/components/landing/v2/como-funciona-section'
import { ReforcoSection } from '@/components/landing/v2/reforco-section'
import { PricingSection } from '@/components/landing/v2/pricing-section'
import { FaqSection } from '@/components/landing/v2/faq-section'
import { FinalCtaSection } from '@/components/landing/v2/final-cta-section'
import type { PartnerLogo } from '@/lib/partner-logos'
import styles from '@/components/landing/v2/landing.module.css'

// Editorial serif for the Tier-B highlight words; scoped to the landing subtree via its variable.
// Self-hosted (next/font/local) — no Google Fonts dependency at dev/build time.
const editorial = localFont({
  src: [
    { path: '../../fonts/InstrumentSerif-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/InstrumentSerif-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-editorial',
  display: 'swap',
})

// Hero display face: Bricolage Grotesque Light — modern, editorial, uncommon. Self-hosted so
// the offline production build never reaches for Google Fonts. Scoped to the hero title only.
const heroDisplay = localFont({
  src: [{ path: '../../fonts/BricolageGrotesque-Light.woff2', weight: '300', style: 'normal' }],
  variable: '--font-hero',
  display: 'swap',
})

export function LandingClient({ logos = [] }: { logos?: PartnerLogo[] }) {
  useSmoothScroll()

  return (
    <div className={`${editorial.variable} ${heroDisplay.variable} ${styles.root}`}>
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-bg-card px-4 py-2 text-sm text-text-hi outline outline-2 outline-brand-soft focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
      >
        Pular para o conteúdo
      </a>
      <ReactiveBackground />
      {/* Hero-region texture (layered silk): z-0 so it sits BEHIND the eye (fixed z-1) and over
          the global bg (-z-10). Self-clipping, fades out at its bottom — no seam with the page bg. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[160vh] overflow-hidden"
      >
        <HeroSilk />
      </div>
      <LandingStage />
      <LandingNav />

      <main id="conteudo" className="relative z-10">
        <Hero logos={logos} />
        <ProblemaSection />
        <ChatSection />
        <TransparenciaSection />
        <BentoSection />
        <ComoFuncionaSection />
        <ReforcoSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
    </div>
  )
}
