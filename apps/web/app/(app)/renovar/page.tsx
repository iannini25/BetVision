import { AppHeader } from '@/components/layout/app-header'
import { GlassCard } from '@/components/ui/glass-card'
import { CheckoutClient } from '@/components/checkout/checkout-client'

export default function RenovarPage() {
  return (
    <>
      <AppHeader title="Renovar passe" />
      <div className="px-8 max-w-xl animate-screenIn">
        <GlassCard>
          <div className="flex flex-col gap-1 mb-5">
            <h2 className="font-display text-lg font-bold">Renove seu Passe da Copa</h2>
            <p className="text-sm text-text-secondary">+45 dias somados ao seu acesso. Escolha como pagar.</p>
          </div>
          <CheckoutClient renew />
        </GlassCard>
      </div>
    </>
  )
}
