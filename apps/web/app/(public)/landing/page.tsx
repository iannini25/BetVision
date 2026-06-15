import type { Metadata } from 'next'
import { getPartnerLogos } from '@/lib/partner-logos'
import { LandingClient } from './landing-client'

const TITLE = 'BetV · Não é mágica. É estatística.'
const DESCRIPTION =
  'O copiloto de inteligência estatística da Copa 2026. Probabilidade real, recalculada lance a lance, e o valor escondido nas odds, nos 104 jogos. Não é casa de aposta. R$ 14,90, passe único via PIX. 18+.'

export const metadata: Metadata = {
  metadataBase: new URL('https://betv.online'),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['Copa 2026', 'probabilidade', 'estatística de futebol', 'odds', 'valor', 'BetV'],
  alternates: { canonical: '/landing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'pt_BR',
    siteName: 'BetV',
    url: '/landing',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function LandingPage() {
  // Read the partner-logos folder at the server and hand the list to the (client) marquee.
  const logos = getPartnerLogos()
  return <LandingClient logos={logos} />
}
