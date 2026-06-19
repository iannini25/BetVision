import { MP_FEES, ACCESS_STATUSES } from './constants'
import { round2 } from './num'

/** Métodos de pagamento aceitos no checkout (Payment Brick cobre todos num componente). */
export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'boleto' | 'wallet'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Custo INTERNO do Mercado Pago por método (a BetV ABSORVE — NÃO repassa ao cliente).
 * Referência para reconciliação/relatórios; o preço cobrado é sempre SUBSCRIPTION_PRICE_BRL fixo.
 */
export function calcFee(base: number, method: PaymentMethod): number {
  if (method === 'boleto') return MP_FEES.boletoFixed
  return round2(base * MP_FEES[method])
}

/** Quanto a BetV efetivamente recebe após o corte do MP (valor cobrado − custo do método). */
export function netReceived(base: number, method: PaymentMethod): number {
  return round2(base - calcFee(base, method))
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

/**
 * ÚNICA fonte da verdade do gate de acesso por estado de assinatura:
 *  - `trial`     → libera (teste grátis ativo) enquanto expiraEm > now
 *  - `active`    → libera enquanto expiraEm > now
 *  - `cancelled` → libera SÓ até o fim do período já pago (expiraEm > now); cancelou mas pagou até lá
 *  - `past_due`  → BLOQUEIA (cobrança recorrente falhou) — fora de ACCESS_STATUSES
 *  - `expired`   → BLOQUEIA — fora de ACCESS_STATUSES
 */
export function hasAccess(status: string, expiraEm: Date | null, now: Date): boolean {
  if (!expiraEm) return false
  return (ACCESS_STATUSES as readonly string[]).includes(status) && expiraEm.getTime() > now.getTime()
}

/** Separa nome completo em firstName/lastName (normaliza espaços; nome único repete no sobrenome p/ o MP). */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ''
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName
  return { firstName, lastName }
}
