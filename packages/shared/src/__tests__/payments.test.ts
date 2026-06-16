import { describe, it, expect } from 'vitest'
import { calcFee, calcTotal, computeNewExpiry, canRenew, splitName } from '../payments'
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

describe('canRenew (janela de renovação)', () => {
  const now = new Date('2026-06-16T12:00:00Z')
  it('sem passe ativo → pode', () => expect(canRenew(null, now, 2)).toBe(true))
  it('faltam 5 dias → NÃO pode', () => expect(canRenew(new Date('2026-06-21T12:00:00Z'), now, 2)).toBe(false))
  it('faltam 2 dias → pode', () => expect(canRenew(new Date('2026-06-18T12:00:00Z'), now, 2)).toBe(true))
  it('já expirado → pode', () => expect(canRenew(new Date('2026-06-10T12:00:00Z'), now, 2)).toBe(true))
})

describe('splitName', () => {
  it('nome completo → primeiro + resto', () => {
    expect(splitName('Bernardo Iannini Silva')).toEqual({ firstName: 'Bernardo', lastName: 'Iannini Silva' })
  })
  it('nome único repete no sobrenome (MP exige last_name)', () => {
    expect(splitName('Madonna')).toEqual({ firstName: 'Madonna', lastName: 'Madonna' })
  })
  it('normaliza espaços extras', () => {
    expect(splitName('  João   Silva ')).toEqual({ firstName: 'João', lastName: 'Silva' })
  })
  it('vazio', () => expect(splitName('')).toEqual({ firstName: '', lastName: '' }))
})
