import { describe, it, expect } from 'vitest'
import { calcFee, calcTotal, computeNewExpiry } from '../payments'
import { SUBSCRIPTION_PRICE_BRL, SUBSCRIPTION_DAYS } from '../constants'

const BASE = SUBSCRIPTION_PRICE_BRL // 14.90

describe('calcFee / calcTotal (taxa repassada ao cliente)', () => {
  it('PIX = 0,99% sobre o valor', () => {
    expect(calcFee(BASE, 'pix')).toBe(0.15) // 14.90 * 0.0099 = 0.14751 → 0.15
    expect(calcTotal(BASE, 'pix')).toBe(15.05)
  })

  it('débito = 1,99%', () => {
    expect(calcFee(BASE, 'debit')).toBe(0.3) // 0.296 → 0.30
    expect(calcTotal(BASE, 'debit')).toBe(15.2)
  })

  it('crédito = 4,98% (taxa maior que PIX)', () => {
    expect(calcFee(BASE, 'credit')).toBe(0.74) // 0.74202 → 0.74
    expect(calcTotal(BASE, 'credit')).toBe(15.64)
    expect(calcTotal(BASE, 'credit')).toBeGreaterThan(calcTotal(BASE, 'pix'))
  })

  it('boleto = taxa FIXA de R$ 3,49 (não percentual)', () => {
    expect(calcFee(BASE, 'boleto')).toBe(3.49)
    expect(calcTotal(BASE, 'boleto')).toBe(18.39)
  })

  it('saldo MP usa a taxa de crédito (conservador)', () => {
    expect(calcFee(BASE, 'wallet')).toBe(calcFee(BASE, 'credit'))
  })
})

describe('computeNewExpiry (extensão do passe)', () => {
  const now = new Date('2026-06-16T12:00:00Z')
  const days = SUBSCRIPTION_DAYS

  it('sem assinatura → conta a partir de agora', () => {
    const expiry = computeNewExpiry(null, now, days)
    expect(expiry.getTime()).toBe(now.getTime() + days * 86_400_000)
  })

  it('assinatura ativa no futuro → empilha a partir do vencimento', () => {
    const future = new Date('2026-07-01T12:00:00Z')
    const expiry = computeNewExpiry(future, now, days)
    expect(expiry.getTime()).toBe(future.getTime() + days * 86_400_000)
  })

  it('assinatura expirada → conta a partir de agora (não do passado)', () => {
    const past = new Date('2026-06-01T12:00:00Z')
    const expiry = computeNewExpiry(past, now, days)
    expect(expiry.getTime()).toBe(now.getTime() + days * 86_400_000)
  })
})
