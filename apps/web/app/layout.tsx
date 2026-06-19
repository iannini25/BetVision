import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { QueryProvider } from '@/lib/query-provider'
import './globals.css'

// Fonts are self-hosted (next/font/local) so dev/build never depend on fetching Google Fonts.
// Files live in app/fonts/ (latin subset covers PT-BR accents). Variable fonts use a weight range.
const inter = localFont({
  src: './fonts/Inter.woff2',
  weight: '100 900',
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono.woff2',
  weight: '100 800',
  variable: '--font-mono',
  display: 'swap',
})

const sora = localFont({
  src: './fonts/Sora.woff2',
  weight: '100 800',
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BetV · Copiloto de Apostas Inteligente',
  description:
    'Estatísticas ao vivo, probabilidades reais e radar de valor para a Copa do Mundo 2026.',
  openGraph: {
    title: 'BetV · Copiloto de Apostas Inteligente',
    description:
      'Estatísticas ao vivo, probabilidades reais e radar de valor para a Copa do Mundo 2026.',
    type: 'website',
    locale: 'pt_BR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable} ${sora.variable}`}
    >
      <body className="font-body bg-bg-primary text-text-primary antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
