import { MP_FEES } from './constants'
import { round2 } from './num'

/** Métodos de pagamento aceitos no checkout (Payment Brick cobre todos num componente). */
export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'boleto' | 'wallet'

const DAY_MS = 24 * 60 * 60 * 1000

/** Taxa de processamento (em R$) que o cliente paga por cima do valor base. */
export function calcFee(base: number, method: PaymentMethod): number {
  if (method === 'boleto') return MP_FEES.boletoFixed
  return round2(base * MP_FEES[method])
}

/** Total cobrado do cliente: valor base + taxa de processamento do método. */
export function calcTotal(base: number, method: PaymentMethod): number {
  return round2(base + calcFee(base, method))
}

/**
 * Nova data de expiração ao aprovar um pagamento: estende a partir do vencimento
 * (se a assinatura está ativa e ainda no futuro) ou de agora (sem assinatura / expirada).
 * Espelha a regra de renovação "+45 dias a partir do vencimento ou de hoje".
 */
export function computeNewExpiry(activeExpiry: Date | null, now: Date, days: number): Date {
  const startFrom = activeExpiry && activeExpiry.getTime() > now.getTime() ? activeExpiry : now
  return new Date(startFrom.getTime() + days * DAY_MS)
}
