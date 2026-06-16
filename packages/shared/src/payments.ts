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

/** Dias inteiros (para cima) até a data, a partir de agora. */
export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS)
}

/** Renovação liberada apenas quando faltam <= unlockDays para expirar (ou já expirou / não há passe). */
export function canRenew(activeExpiry: Date | null, now: Date, unlockDays: number): boolean {
  if (!activeExpiry) return true
  return daysUntil(activeExpiry, now) <= unlockDays
}

/** Separa nome completo em firstName/lastName (normaliza espaços; nome único repete no sobrenome p/ o MP). */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ''
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName
  return { firstName, lastName }
}
